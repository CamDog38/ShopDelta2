import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { computeYoYAnnualAggregate, computeYoYAnnualProduct, computeYoYMonthlyProduct } from "../analytics.yoy.server";

// Support both GET and POST
export const loader = async ({ request }: LoaderFunctionArgs) => {
  return handleExport(request);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }
  return handleExport(request);
};

async function handleExport(request: Request) {
  console.log("[EXPORT] Starting export request");
  console.log("[EXPORT] Request method:", request.method);
  console.log("[EXPORT] Request URL:", request.url);
  
  try {
    console.log("[EXPORT] Attempting authentication...");
    var { admin } = await authenticate.admin(request);
    console.log("[EXPORT] Authentication successful");
  } catch (error) {
    // Shopify auth throws a Response object (redirect) on auth failure
    if (error instanceof Response) {
      console.error("[EXPORT] Authentication redirect response:", error.status, error.statusText);
      console.error("[EXPORT] Redirect location:", error.headers.get("location"));
      // Re-throw the response to let Remix handle the redirect
      throw error;
    }
    console.error("[EXPORT] Authentication failed:", error instanceof Error ? error.message : String(error));
    console.error("[EXPORT] Error details:", error);
    return json({ error: "Unauthorized", details: error instanceof Error ? error.message : String(error) }, { status: 401 });
  }
  
  const url = new URL(request.url);
  const format = url.searchParams.get("format");
  
  console.log("[EXPORT] Format requested:", format);
  
  if (format !== "xlsx") {
    console.warn("[EXPORT] Invalid format requested:", format);
    return json({ error: "Only xlsx format is supported" }, { status: 400 });
  }

  // Get all filter parameters
  const start = url.searchParams.get("start") || "";
  const end = url.searchParams.get("end") || "";
  const granularity = url.searchParams.get("granularity") || "day";
  const preset = url.searchParams.get("preset") || "last30";
  const view = url.searchParams.get("view") || "chart";
  const compare = url.searchParams.get("compare") || "none";
  const compareScope = url.searchParams.get("compareScope") || "aggregate";
  const metric = url.searchParams.get("metric") || "qty";
  const chartScope = url.searchParams.get("chartScope") || "aggregate";

  console.log("[EXPORT] Filter parameters:", { start, end, granularity, view, metric });

  // Collect full analytics directly from Shopify
  const ORDERS_QUERY = `#graphql
    query AnalyticsRecentOrders($first: Int!, $search: String, $after: String) {
      orders(first: $first, after: $after, sortKey: PROCESSED_AT, reverse: true, query: $search) {
        pageInfo { hasNextPage }
        edges {
          cursor
          node {
            id
            processedAt
            lineItems(first: 100) {
              edges { node { quantity discountedTotalSet { shopMoney { amount currencyCode } } product { id title } title } }
            }
          }
        }
      }
    }
  `;

  function startOfWeek(d: Date) { const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); const dow = dt.getUTCDay(); const diff = (dow + 6) % 7; dt.setUTCDate(dt.getUTCDate() - diff); return dt; }
  function startOfMonth(d: Date) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); }
  function ymd(d: Date) { return d.toISOString().slice(0, 10); }

  const sDate = start ? new Date(start + 'T00:00:00.000Z') : undefined;
  const eDate = end ? new Date(end + 'T23:59:59.999Z') : undefined;
  const search = `processed_at:>='${sDate?.toISOString()}' processed_at:<='${eDate?.toISOString()}'`;
  console.log('[EXPORT] Shopify search:', search);

  const counts = new Map<string, { title: string; qty: number; sales: number }>();
  const dayMap = new Map<string, { label: string; qty: number; sales: number }>();
  const weekMap = new Map<string, { label: string; qty: number; sales: number }>();
  const monthMap = new Map<string, { label: string; qty: number; sales: number }>();
  let totalQty = 0; let totalSales = 0; let currencyCode: string | null = null;

  let after: string | null = null;
  while (true) {
    const res: Response = await admin.graphql(ORDERS_QUERY, { variables: { first: 250, search, after } });
    const data = await res.json();
    const page = (data as any)?.data?.orders;
    const edges = page?.edges ?? [];
    for (const edge of edges) {
      const processedAt: string = edge?.node?.processedAt;
      const d = new Date(processedAt);
      const dayKey = ymd(d);
      const ws = startOfWeek(d); const weekKey = `W:${ymd(ws)}`; const weekLabel = `Week of ${ws.toLocaleDateString('en-CA')}`;
      const ms = startOfMonth(d); const monthKey = `${ms.getUTCFullYear()}-${String(ms.getUTCMonth()+1).padStart(2,'0')}`; const monthLabel = `${ms.toLocaleString('en-US',{month:'short'})} ${ms.getUTCFullYear()}`;
      if (!dayMap.has(dayKey)) dayMap.set(dayKey, { label: dayKey, qty: 0, sales: 0 });
      if (!weekMap.has(weekKey)) weekMap.set(weekKey, { label: weekLabel, qty: 0, sales: 0 });
      if (!monthMap.has(monthKey)) monthMap.set(monthKey, { label: monthLabel, qty: 0, sales: 0 });
      const liEdges = edge?.node?.lineItems?.edges ?? [];
      for (const li of liEdges) {
        const qty: number = li?.node?.quantity ?? 0;
        const amountStr: string | undefined = li?.node?.discountedTotalSet?.shopMoney?.amount as any;
        const curr: string | undefined = li?.node?.discountedTotalSet?.shopMoney?.currencyCode as any;
        const amt = amountStr ? parseFloat(amountStr) : 0;
        if (!currencyCode && curr) currencyCode = curr;
        const p = li?.node?.product;
        const fallbackTitle: string = li?.node?.title ?? 'Unknown product';
        const pid: string = p?.id ?? `li:${fallbackTitle}`;
        const title: string = p?.title ?? fallbackTitle;
        if (!counts.has(pid)) counts.set(pid, { title, qty: 0, sales: 0 });
        const acc = counts.get(pid)!; acc.qty += qty; acc.sales += amt;
        totalQty += qty; totalSales += amt;
        dayMap.get(dayKey)!.qty += qty; dayMap.get(dayKey)!.sales += amt;
        weekMap.get(weekKey)!.qty += qty; weekMap.get(weekKey)!.sales += amt;
        monthMap.get(monthKey)!.qty += qty; monthMap.get(monthKey)!.sales += amt;
      }
    }
    if (page?.pageInfo?.hasNextPage) after = edges.length ? edges[edges.length - 1]?.cursor : null; else break;
  }

  const allProductsQty = Array.from(counts.values()).map(v => ({ title: v.title, quantity: v.qty })).sort((a,b)=> b.quantity - a.quantity);
  const allProductsSales = Array.from(counts.values()).map(v => ({ title: v.title, sales: v.sales })).sort((a,b)=> b.sales - a.sales);
  const toSeries = (mp: Map<string,{label:string;qty:number;sales:number}>) => Array.from(mp.entries()).map(([k,v])=>({ key:k, label:v.label, qty:v.qty, sales:v.sales })).sort((a,b)=> (a.key > b.key ? 1 : -1));
  const seriesDay = toSeries(dayMap);
  const seriesWeek = toSeries(weekMap);
  const seriesMonth = toSeries(monthMap);
  const series = granularity === 'week' ? seriesWeek : granularity === 'month' ? seriesMonth : seriesDay;

  // Dynamically import xlsx to avoid Vite bundling issues
  console.log("[EXPORT] Importing xlsx library...");
  const XLSX = await import("xlsx");
  console.log("[EXPORT] xlsx library imported successfully");

  // Create a new workbook
  const wb = XLSX.utils.book_new();
  console.log("[EXPORT] Creating workbook with multiple sheets...");
  // Helper to format monetary columns using header detection
  function formatMoneyColumns(ws: any) {
    if (!ws || !ws['!ref']) return;
    const range = XLSX.utils.decode_range(ws['!ref']);
    const headerRow = 3; // 0-index (row 4) holds headers for our sheets
    const keywords = ['sales', 'revenue', 'price', 'amount'];
    const moneyCols: number[] = [];
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: headerRow, c: C });
      const cell = ws[addr];
      const v = typeof cell?.v === 'string' ? cell.v.toLowerCase() : '';
      if (v && keywords.some(k => v.includes(k)) && !v.includes('%')) moneyCols.push(C);
    }
    if (!moneyCols.length) return;
    for (let R = headerRow + 1; R <= range.e.r; R++) {
      for (const C of moneyCols) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[addr];
        if (cell && typeof cell.v === 'number') {
          cell.z = "#,##0.00";
        }
      }
    }
  }
  
  // Sheet 1: Export Info & Filters
  const filterData = [
    ["Analytics Export - Shopify Data"],
    [`Generated: ${new Date().toISOString()}`],
    [],
    ["Filters Applied:"],
    ["Date Range", `${start} to ${end}`],
    ["Granularity", granularity],
    ["View", view],
    ["Metric", metric],
    ["Compare", compare],
    ["Compare Scope", compareScope],
    [],
    ["NOTE: Data below is aggregated from Shopify orders API"],
    ["This export includes all transactions within the selected date range"],
  ];
  
  const filterSheet = XLSX.utils.aoa_to_sheet(filterData as any[]);
  filterSheet["!cols"] = [{ wch: 25 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, filterSheet, "Export Info");
  console.log("[EXPORT] Added 'Export Info' sheet");
  
  // Sheet 2: Trends by Quantity
  const trendsQtyData: any[][] = [
    ["Trends - Quantity (by " + granularity + ")"],
    ["Date Range", `${start} to ${end}`],
    [],
    ["Period", "Quantity"],
  ];
  
  // Add real data from analytics
  series.forEach((item: any) => { trendsQtyData.push([item.label || item.key, item.qty || 0]); });
  
  const trendsQtySheet = XLSX.utils.aoa_to_sheet(trendsQtyData);
  trendsQtySheet["!cols"] = [{ wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, trendsQtySheet, "Trends - Qty");
  console.log("[EXPORT] Added 'Trends - Qty' sheet with", series.length, "data points");
  
  // Sheet 3: Trends by Sales
  const trendsSalesData: any[][] = [
    ["Trends - Sales (by " + granularity + ")"],
    ["Date Range", `${start} to ${end}`],
    [],
    ["Period", "Sales"],
  ];
  
  // Add real data from analytics
  series.forEach((item: any) => { trendsSalesData.push([item.label || item.key, item.sales || 0]); });
  
  const trendsSalesSheet = XLSX.utils.aoa_to_sheet(trendsSalesData);
  trendsSalesSheet["!cols"] = [{ wch: 20 }, { wch: 15 }];
  formatMoneyColumns(trendsSalesSheet);
  XLSX.utils.book_append_sheet(wb, trendsSalesSheet, "Trends - Sales");
  console.log("[EXPORT] Added 'Trends - Sales' sheet with", series.length, "data points");
  
  // Sheet 4: All Products by Quantity
  const breakdownQtyData: any[][] = [
    ["All Products - Quantity"],
    ["Date Range", `${start} to ${end}`],
    [],
    ["Rank", "Product", "Quantity"],
  ];
  
  // Add all products to sheet
  allProductsQty.forEach((product, index) => {
    breakdownQtyData.push([index + 1, product.title, product.quantity]);
  });
  
  const breakdownQtySheet = XLSX.utils.aoa_to_sheet(breakdownQtyData);
  breakdownQtySheet["!cols"] = [{ wch: 8 }, { wch: 35 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, breakdownQtySheet, "All Products - Qty");
  console.log("[EXPORT] Added 'All Products - Qty' sheet with", allProductsQty.length, "products");
  
  // Sheet 5: All Products by Sales  
  const breakdownSalesData: any[][] = [
    ["All Products - Sales"],
    ["Date Range", `${start} to ${end}`],
    [],
    ["Rank", "Product", "Sales"],
  ];
  
  allProductsSales.forEach((product, index) => {
    breakdownSalesData.push([index + 1, product.title, product.sales]);
  });
  
  const breakdownSalesSheet = XLSX.utils.aoa_to_sheet(breakdownSalesData);
  breakdownSalesSheet["!cols"] = [{ wch: 8 }, { wch: 35 }, { wch: 15 }];
  formatMoneyColumns(breakdownSalesSheet);
  XLSX.utils.book_append_sheet(wb, breakdownSalesSheet, "All Products - Sales");
  console.log("[EXPORT] Added 'All Products - Sales' sheet with", allProductsSales.length, "products");
  
  // Sheet 6: Summary - Top 10 and Bottom 10
  const summaryData: any[][] = [
    ["Summary - Top & Bottom Performers"],
    ["Date Range", `${start} to ${end}`],
    [],
    ["TOP 10 PRODUCTS BY QUANTITY"],
    ["Rank", "Product", "Quantity"],
  ];
  
  // Add top 10 by quantity
  allProductsQty.slice(0, 10).forEach((product, index) => {
    summaryData.push([index + 1, product.title, product.quantity]);
  });
  
  summaryData.push([]);
  summaryData.push(["BOTTOM 10 PRODUCTS BY QUANTITY"]);
  summaryData.push(["Rank", "Product", "Quantity"]);
  
  // Add bottom 10 by quantity
  const bottom10Qty = allProductsQty.slice(-10).reverse();
  bottom10Qty.forEach((product, index) => {
    summaryData.push([allProductsQty.length - 9 + index, product.title, product.quantity]);
  });
  
  summaryData.push([]);
  summaryData.push([]);
  summaryData.push(["TOP 10 PRODUCTS BY SALES"]);
  summaryData.push(["Rank", "Product", "Sales"]);
  
  // Add top 10 by sales
  allProductsSales.slice(0, 10).forEach((product, index) => {
    summaryData.push([index + 1, product.title, product.sales]);
  });
  
  summaryData.push([]);
  summaryData.push(["BOTTOM 10 PRODUCTS BY SALES"]);
  summaryData.push(["Rank", "Product", "Sales"]);
  
  // Add bottom 10 by sales
  const bottom10Sales = allProductsSales.slice(-10).reverse();
  bottom10Sales.forEach((product, index) => {
    summaryData.push([allProductsSales.length - 9 + index, product.title, product.sales]);
  });
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet["!cols"] = [{ wch: 8 }, { wch: 35 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");
  console.log("[EXPORT] Added 'Summary' sheet with top/bottom 10 products");
  
  // Sheet 7: Breakdown by Day
  const dayBreakdownData: any[][] = [["Breakdown by Day"],["Date Range", `${start} to ${end}`],[],["Date","Quantity","Sales"]];
  seriesDay.forEach((item: any) => { dayBreakdownData.push([item.label || item.key, item.qty || 0, item.sales || 0]); });
  const dayBreakdownSheet = XLSX.utils.aoa_to_sheet(dayBreakdownData);
  dayBreakdownSheet["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }];
  formatMoneyColumns(dayBreakdownSheet);
  XLSX.utils.book_append_sheet(wb, dayBreakdownSheet, "By Day");
  console.log("[EXPORT] Added 'By Day' sheet");
  
  // Sheet 8: Breakdown by Week
  const weekBreakdownData: any[][] = [["Breakdown by Week"],["Date Range", `${start} to ${end}`],[],["Week","Quantity","Sales"]];
  seriesWeek.forEach((item: any) => { weekBreakdownData.push([item.label, item.qty, item.sales]); });
  const weekBreakdownSheet = XLSX.utils.aoa_to_sheet(weekBreakdownData);
  weekBreakdownSheet["!cols"] = [{ wch: 24 }, { wch: 15 }, { wch: 15 }];
  formatMoneyColumns(weekBreakdownSheet);
  XLSX.utils.book_append_sheet(wb, weekBreakdownSheet, "By Week");
  console.log("[EXPORT] Added 'By Week' sheet");

  // Sheet 9: Breakdown by Month
  const monthBreakdownData: any[][] = [["Breakdown by Month"],["Date Range", `${start} to ${end}`],[],["Month","Quantity","Sales"]];
  seriesMonth.forEach((item: any) => { monthBreakdownData.push([item.label, item.qty, item.sales]); });
  const monthBreakdownSheet = XLSX.utils.aoa_to_sheet(monthBreakdownData);
  monthBreakdownSheet["!cols"] = [{ wch: 18 }, { wch: 15 }, { wch: 15 }];
  formatMoneyColumns(monthBreakdownSheet);
  XLSX.utils.book_append_sheet(wb, monthBreakdownSheet, "By Month");
  console.log("[EXPORT] Added 'By Month' sheet");

  // Sheet 10: Compare - MoM (matches app layout)
  const momHeaders = ["Period", "Qty (Curr)", "Qty (Prev)", "Qty Δ", "Qty Δ%", "Sales (Curr)", "Sales (Prev)", "Sales Δ", "Sales Δ%"]; 
  const momData: any[][] = [["Month-over-Month Comparison"],["Date Range", `${start} to ${end}`],[], momHeaders];
  for (let i = 1; i < seriesMonth.length; i++) {
    const prev = seriesMonth[i - 1];
    const curr = seriesMonth[i];
    const qd = (curr.qty || 0) - (prev.qty || 0);
    const sd = (curr.sales || 0) - (prev.sales || 0);
    momData.push([`${prev.label} → ${curr.label}`, curr.qty || 0, prev.qty || 0, qd, prev.qty ? ((qd / prev.qty) * 100) : null, curr.sales || 0, prev.sales || 0, sd, prev.sales ? ((sd / prev.sales) * 100) : null]);
  }
  const momSheet = XLSX.utils.aoa_to_sheet(momData);
  momSheet["!cols"] = [{ wch: 26 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 10 }];
  formatMoneyColumns(momSheet);
  XLSX.utils.book_append_sheet(wb, momSheet, "Compare - MoM");
  console.log("[EXPORT] Added 'Compare - MoM' sheet");

  // Sheet 11: Compare - Year (YTD vs previous YTD)
  try {
    const now = eDate || new Date();
    const yearB = now.getUTCFullYear();
    const yearA = yearB - 1;
    const yoy = await computeYoYAnnualAggregate({ admin, yearA, yearB, ytd: true });
    const ytdEnd = `${yearB}-${String((now.getUTCMonth()+1)).padStart(2,'0')}-${String(now.getUTCDate()).padStart(2,'0')}`;
    const yoyData: any[][] = [["Year-over-Year (YTD)"],["Date Range", `${yearB}-01-01 to ${ytdEnd}`],[], yoy.headers];
    yoy.table.forEach((r: any) => yoyData.push([r.period, r.qtyCurr, r.qtyPrev, r.qtyDelta, r.qtyDeltaPct, r.salesCurr, r.salesPrev, r.salesDelta, r.salesDeltaPct]));
    const yoySheet = XLSX.utils.aoa_to_sheet(yoyData);
    yoySheet["!cols"] = [{ wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 10 }];
    formatMoneyColumns(yoySheet);
    XLSX.utils.book_append_sheet(wb, yoySheet, "Compare - Year");
    console.log("[EXPORT] Added 'Compare - Year' sheet");
  } catch (e) {
    console.warn('[EXPORT] YoY computation failed:', (e as any)?.message || e);
  }

  // Sheet 12: YoY Product Comparison (Monthly or Annual, depending on filters)
  try {
    const compare = url.searchParams.get("compare");
    const compareScope = url.searchParams.get("compareScope");
    const yoyMode = url.searchParams.get("yoyMode") || "monthly";
    const yoyA = url.searchParams.get("yoyA");
    const yoyB = url.searchParams.get("yoyB");
    const yoyYearA = url.searchParams.get("yoyYearA");
    const yoyYearB = url.searchParams.get("yoyYearB");
    const yoyYtd = url.searchParams.get("yoyYtd");

    if (compare === "yoy" && compareScope === "product") {
      if (yoyMode === "monthly" && sDate && eDate) {
        console.log("[EXPORT] Computing YoY Monthly Product data...");
        const yoyProduct = await computeYoYMonthlyProduct({ admin, start: sDate, end: eDate, yoyA: yoyA || undefined, yoyB: yoyB || undefined });

        const monthLabel = (ym?: string) => {
          if (!ym) return '';
          const [y, m] = ym.split('-').map((x) => parseInt(x, 10));
          if (!y || !m) return ym;
          const d = new Date(Date.UTC(y, m - 1, 1));
          return `${d.toLocaleString('en-US', { month: 'short' })} ${y}`;
        };

        const productComparisonData: any[][] = [
          ["Product Comparison (YoY Monthly)"],
          ["Date Range", `${start} to ${end}`],
          []
        ];

        if (yoyA && yoyB) {
          productComparisonData.push([`Product (${monthLabel(yoyB)}  ${monthLabel(yoyA)})`, `Qty (${monthLabel(yoyB)})`, `Qty (${monthLabel(yoyA)})`, 'Qty ', 'Qty %', `Sales (${monthLabel(yoyB)})`, `Sales (${monthLabel(yoyA)})`, 'Sales ', 'Sales %']);
        } else {
          productComparisonData.push(['Product', 'Qty (Curr)', 'Qty (Prev)', 'Qty ', 'Qty %', 'Sales (Curr)', 'Sales (Prev)', 'Sales ', 'Sales %']);
        }

        yoyProduct.table.forEach((r: any) => {
          productComparisonData.push([
            r.product,
            r.qtyCurr,
            r.qtyPrev,
            r.qtyDelta,
            r.qtyDeltaPct,
            r.salesCurr,
            r.salesPrev,
            r.salesDelta,
            r.salesDeltaPct
          ]);
        });

        const productSheet = XLSX.utils.aoa_to_sheet(productComparisonData);
        productSheet["!cols"] = [{ wch: 40 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 10 }];
        formatMoneyColumns(productSheet);
        XLSX.utils.book_append_sheet(wb, productSheet, "YoY - Products");
        console.log("[EXPORT] Added 'YoY - Products' sheet with", yoyProduct.table.length, "products");
      } else if (yoyMode === "annual") {
        console.log("[EXPORT] Computing YoY Annual Product data...");
        const now = new Date();
        const nowY = now.getUTCFullYear();
        const yearA = yoyYearA ? parseInt(yoyYearA, 10) : nowY - 1;
        const yearB = yoyYearB ? parseInt(yoyYearB, 10) : nowY;
        const ytd = !!(yoyYtd && (/^(1|true)$/i).test(yoyYtd));
        const yoyProductAnnual = await computeYoYAnnualProduct({ admin, yearA, yearB, ytd });

        const title = ytd
          ? `Product Comparison (YoY Annual YTD ${yearB} vs ${yearA})`
          : `Product Comparison (YoY Annual ${yearB} vs ${yearA})`;

        const productAnnualData: any[][] = [
          [title],
          ["Years", ytd ? `${yearA} YTD vs ${yearB} YTD` : `${yearA} vs ${yearB}`],
          [],
          yoyProductAnnual.headers,
        ];

        yoyProductAnnual.table.forEach((r: any) => {
          productAnnualData.push([
            r.product,
            r.qtyCurr,
            r.qtyPrev,
            r.qtyDelta,
            r.qtyDeltaPct,
            r.salesCurr,
            r.salesPrev,
            r.salesDelta,
            r.salesDeltaPct,
          ]);
        });

        const productAnnualSheet = XLSX.utils.aoa_to_sheet(productAnnualData);
        productAnnualSheet["!cols"] = [{ wch: 40 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 10 }];
        formatMoneyColumns(productAnnualSheet);
        XLSX.utils.book_append_sheet(wb, productAnnualSheet, "YoY - Products (Annual)");
        console.log("[EXPORT] Added 'YoY - Products (Annual)' sheet with", yoyProductAnnual.table.length, "products");
      }
    }
  } catch (e) {
    console.warn('[EXPORT] YoY product computation failed:', (e as any)?.message || e);
  }
  
  // Generate buffer
  console.log("[EXPORT] Generating Excel workbook buffer...");
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
  console.log("[EXPORT] Buffer generated successfully, size:", buffer.length, "bytes");
  
  // Return as Excel file
  console.log("[EXPORT] Returning Excel file with proper headers");
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="analytics-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
