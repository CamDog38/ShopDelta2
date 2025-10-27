import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { loader as analyticsLoader } from "../app.analytics.server";

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
    const authResult = await authenticate.admin(request);
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

  // Fetch real analytics data
  console.log("[EXPORT] Fetching analytics data...");
  const analyticsResponse = await analyticsLoader({ 
    request, 
    params: {}, 
    context: {} as any 
  });
  const analyticsData: any = await analyticsResponse.json();
  console.log("[EXPORT] Analytics data fetched successfully");
  
  // Check if there was an error
  if (analyticsData.error) {
    console.error("[EXPORT] Analytics data error:", analyticsData.error);
    return json({ error: "Failed to fetch analytics data", details: analyticsData.message || analyticsData.error }, { status: 500 });
  }

  // Dynamically import xlsx to avoid Vite bundling issues
  console.log("[EXPORT] Importing xlsx library...");
  const XLSX = await import("xlsx");
  console.log("[EXPORT] xlsx library imported successfully");

  // Create a new workbook
  const wb = XLSX.utils.book_new();
  console.log("[EXPORT] Creating workbook with multiple sheets...");
  
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
  
  const filterSheet = XLSX.utils.aoa_to_sheet(filterData);
  filterSheet["!cols"] = [{ wch: 25 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, filterSheet, "Export Info");
  console.log("[EXPORT] Added 'Export Info' sheet");
  
  // Sheet 2: Trends by Quantity
  const trendsQtyData = [
    ["Trends - Quantity (by " + granularity + ")"],
    [],
    ["Period", "Quantity"],
  ];
  
  // Add real data from analytics
  if (analyticsData.series && Array.isArray(analyticsData.series)) {
    analyticsData.series.forEach((item: any) => {
      trendsQtyData.push([item.label || item.key, item.quantity || 0]);
    });
  }
  
  const trendsQtySheet = XLSX.utils.aoa_to_sheet(trendsQtyData);
  trendsQtySheet["!cols"] = [{ wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, trendsQtySheet, "Trends - Qty");
  console.log("[EXPORT] Added 'Trends - Qty' sheet with", analyticsData.series?.length || 0, "data points");
  
  // Sheet 3: Trends by Sales
  const trendsSalesData = [
    ["Trends - Sales (by " + granularity + ")"],
    [],
    ["Period", "Sales"],
  ];
  
  // Add real data from analytics
  if (analyticsData.series && Array.isArray(analyticsData.series)) {
    analyticsData.series.forEach((item: any) => {
      trendsSalesData.push([item.label || item.key, item.sales || 0]);
    });
  }
  
  const trendsSalesSheet = XLSX.utils.aoa_to_sheet(trendsSalesData);
  trendsSalesSheet["!cols"] = [{ wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, trendsSalesSheet, "Trends - Sales");
  console.log("[EXPORT] Added 'Trends - Sales' sheet with", analyticsData.series?.length || 0, "data points");
  
  // Sheet 4: All Products by Quantity
  const breakdownQtyData = [
    ["All Products - Quantity"],
    [],
    ["Rank", "Product", "Quantity"],
  ];
  
  // Extract ALL products from table data (which has complete product breakdown)
  const allProductsQty: Array<{title: string, quantity: number}> = [];
  if (analyticsData.table && Array.isArray(analyticsData.table)) {
    // Aggregate quantities across all time periods for each product
    const productTotals = new Map<string, number>();
    analyticsData.table.forEach((row: any) => {
      Object.keys(row).forEach(key => {
        if (key !== 'key' && key !== 'label' && typeof row[key] === 'number') {
          const currentTotal = productTotals.get(key) || 0;
          productTotals.set(key, currentTotal + row[key]);
        }
      });
    });
    
    productTotals.forEach((quantity, title) => {
      allProductsQty.push({ title, quantity });
    });
    allProductsQty.sort((a, b) => b.quantity - a.quantity);
  }
  
  // Add all products to sheet
  allProductsQty.forEach((product, index) => {
    breakdownQtyData.push([index + 1, product.title, product.quantity]);
  });
  
  const breakdownQtySheet = XLSX.utils.aoa_to_sheet(breakdownQtyData);
  breakdownQtySheet["!cols"] = [{ wch: 8 }, { wch: 35 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, breakdownQtySheet, "All Products - Qty");
  console.log("[EXPORT] Added 'All Products - Qty' sheet with", allProductsQty.length, "products");
  
  // Sheet 5: All Products by Sales  
  const breakdownSalesData = [
    ["All Products - Sales"],
    [],
    ["Rank", "Product", "Sales"],
  ];
  
  // Use topProductsBySales which should have all products sorted by sales
  // Note: We'll need to enhance this to get ALL products, not just top 50
  const allProductsSales: Array<{title: string, sales: number}> = [];
  if (analyticsData.topProductsBySales && Array.isArray(analyticsData.topProductsBySales)) {
    analyticsData.topProductsBySales.forEach((product: any) => {
      allProductsSales.push({ title: product.title, sales: product.sales || 0 });
    });
  }
  
  allProductsSales.forEach((product, index) => {
    breakdownSalesData.push([index + 1, product.title, product.sales]);
  });
  
  const breakdownSalesSheet = XLSX.utils.aoa_to_sheet(breakdownSalesData);
  breakdownSalesSheet["!cols"] = [{ wch: 8 }, { wch: 35 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, breakdownSalesSheet, "All Products - Sales");
  console.log("[EXPORT] Added 'All Products - Sales' sheet with", allProductsSales.length, "products");
  
  // Sheet 6: Summary - Top 10 and Bottom 10
  const summaryData: any[] = [
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
  const dayBreakdownData: any[] = [
    ["Breakdown by Day"],
    [],
    ["Date", "Quantity", "Sales"],
  ];
  
  if (analyticsData.series && Array.isArray(analyticsData.series)) {
    analyticsData.series.forEach((item: any) => {
      dayBreakdownData.push([item.label || item.key, item.quantity || 0, item.sales || 0]);
    });
  }
  
  const dayBreakdownSheet = XLSX.utils.aoa_to_sheet(dayBreakdownData);
  dayBreakdownSheet["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, dayBreakdownSheet, "By Day");
  console.log("[EXPORT] Added 'By Day' sheet");
  
  // Sheet 8: Compare - YTD vs Previous YTD (Year)
  const compareYearData: any[] = [
    ["Compare - YTD vs Previous Year YTD"],
    [],
    ["Period", "Current YTD Qty", "Previous YTD Qty", "Current YTD Sales", "Previous YTD Sales"],
  ];
  
  // Use YoY data if available
  if (analyticsData.yoyCurrMonths && Array.isArray(analyticsData.yoyCurrMonths)) {
    compareYearData.push(["Year to Date", 
      analyticsData.totals?.qty || 0, 
      analyticsData.yoyPrevTotal?.qty || 0,
      analyticsData.totals?.sales || 0,
      analyticsData.yoyPrevTotal?.sales || 0
    ]);
  }
  
  const compareYearSheet = XLSX.utils.aoa_to_sheet(compareYearData);
  compareYearSheet["!cols"] = [{ wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, compareYearSheet, "Compare - Year");
  console.log("[EXPORT] Added 'Compare - Year' sheet");
  
  // Sheet 9: Compare - Months YTD
  const compareMonthsData: any[] = [
    ["Compare - Months YTD (Current Period)"],
    [],
    ["Month", "Quantity", "Sales"],
  ];
  
  // Use month-by-month YoY data if available
  if (analyticsData.yoyCurrMonths && Array.isArray(analyticsData.yoyCurrMonths)) {
    analyticsData.yoyCurrMonths.forEach((month: any) => {
      compareMonthsData.push([month.label || month.key, month.quantity || 0, month.sales || 0]);
    });
  }
  
  const compareMonthsSheet = XLSX.utils.aoa_to_sheet(compareMonthsData);
  compareMonthsSheet["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, compareMonthsSheet, "Compare - Months");
  console.log("[EXPORT] Added 'Compare - Months' sheet");
  
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
