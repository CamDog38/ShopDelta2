import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

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

  // Dynamically import xlsx to avoid Vite bundling issues
  console.log("[EXPORT] Importing xlsx library...");
  const XLSX = await import("xlsx");
  console.log("[EXPORT] xlsx library imported successfully");

  // Create a new workbook
  const wb = XLSX.utils.book_new();
  
  // Create summary sheet
  const summaryData = [
    ["Analytics Export"],
    [`Generated: ${new Date().toISOString()}`],
    [],
    ["Filters Applied:"],
    ["Date Range", `${start} to ${end}`],
    ["Granularity", granularity],
    ["View", view],
    ["Metric", metric],
    ["Compare", compare],
    [],
    ["Period", "Quantity", "Sales"],
    ["Sample Data", 100, 1000],
    ["Sample Data", 150, 1500],
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet["!cols"] = [{ wch: 20 }, { wch: 25 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");
  
  // Create detailed data sheet
  const detailedData = [
    ["Detailed Analytics Data"],
    [],
    ["Period", "Quantity", "Sales", "Change %"],
    ["2024-01-01", 150, 1500, 5.2],
    ["2024-01-02", 160, 1600, 6.7],
    ["2024-01-03", 145, 1450, -9.4],
  ];
  
  const detailedSheet = XLSX.utils.aoa_to_sheet(detailedData);
  detailedSheet["!cols"] = [{ wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, detailedSheet, "Detailed");
  
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
