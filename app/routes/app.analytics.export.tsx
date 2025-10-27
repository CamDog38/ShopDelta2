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
  try {
    await authenticate.admin(request);
  } catch (error) {
    // If authentication fails, return a 401 which will trigger re-auth
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const url = new URL(request.url);
  const format = url.searchParams.get("format");
  
  if (format !== "xlsx") {
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

  // Dynamically import xlsx to avoid Vite bundling issues
  const XLSX = await import("xlsx");

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
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
  
  // Return as Excel file
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="analytics-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
