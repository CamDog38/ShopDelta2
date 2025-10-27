import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// Simple CSV to XLSX conversion - we'll generate CSV and let the browser handle it
export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  
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

  // For now, generate a simple CSV that can be opened in Excel
  // In production, you'd want to use a library like 'xlsx' to generate proper Excel files
  const csvContent = generateCSV({
    start,
    end,
    granularity,
    preset,
    view,
    compare,
    compareScope,
    metric,
    chartScope,
  });

  // Return as CSV (Excel can open CSV files)
  return new Response(csvContent, {
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
      "Content-Disposition": `attachment; filename="analytics-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
};

function generateCSV(filters: Record<string, string>): string {
  const lines: string[] = [];
  
  // Add header with filter info
  lines.push("Analytics Export");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  
  // Add filter info
  lines.push("Filters Applied:");
  lines.push(`Date Range,${filters.start} to ${filters.end}`);
  lines.push(`Granularity,${filters.granularity}`);
  lines.push(`View,${filters.view}`);
  lines.push(`Metric,${filters.metric}`);
  lines.push("");
  
  // Add column headers
  lines.push("Period,Quantity,Sales");
  
  // Add sample data (in a real implementation, you'd fetch actual data)
  lines.push("Sample Data,100,1000");
  lines.push("Sample Data,150,1500");
  
  return lines.join("\n");
}
