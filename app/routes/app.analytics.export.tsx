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
  
  // Sheet 4: Breakdown by Product - Quantity
  const breakdownQtyData = [
    ["Breakdown - Products by Quantity"],
    [],
    ["Product", "Quantity"],
  ];
  
  // Add real product data
  if (analyticsData.topProducts && Array.isArray(analyticsData.topProducts)) {
    analyticsData.topProducts.forEach((product: any) => {
      breakdownQtyData.push([product.title, product.quantity || 0]);
    });
  }
  
  const breakdownQtySheet = XLSX.utils.aoa_to_sheet(breakdownQtyData);
  breakdownQtySheet["!cols"] = [{ wch: 30 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, breakdownQtySheet, "Breakdown - Qty");
  console.log("[EXPORT] Added 'Breakdown - Qty' sheet with", analyticsData.topProducts?.length || 0, "products");
  
  // Sheet 5: Breakdown by Product - Sales
  const breakdownSalesData = [
    ["Breakdown - Products by Sales"],
    [],
    ["Product", "Sales"],
  ];
  
  // Add real product data
  if (analyticsData.topProductsBySales && Array.isArray(analyticsData.topProductsBySales)) {
    analyticsData.topProductsBySales.forEach((product: any) => {
      breakdownSalesData.push([product.title, product.sales || 0]);
    });
  }
  
  const breakdownSalesSheet = XLSX.utils.aoa_to_sheet(breakdownSalesData);
  breakdownSalesSheet["!cols"] = [{ wch: 30 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, breakdownSalesSheet, "Breakdown - Sales");
  console.log("[EXPORT] Added 'Breakdown - Sales' sheet with", analyticsData.topProductsBySales?.length || 0, "products");
  
  // Sheet 6: Summary
  const summaryData = [
    ["Summary Statistics"],
    ["Date Range", `${start} to ${end}`],
    [],
    ["Metric", "Value"],
    ["Total Quantity", analyticsData.totals?.qty || 0],
    ["Total Sales", analyticsData.totals?.sales || 0],
    ["Currency", analyticsData.totals?.currency || "USD"],
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet["!cols"] = [{ wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");
  console.log("[EXPORT] Added 'Summary' sheet");
  
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
