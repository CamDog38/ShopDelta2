import type { LinksFunction } from "@remix-run/node";
import { useLoaderData, useLocation, useRouteError, useSubmit, useNavigation } from "@remix-run/react";
import { useState } from "react";
import { Page, DataTable, BlockStack, Text, Link, Button, InlineStack, Spinner } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { YoYControls } from "./components/YoYControls";
import analyticsStylesUrl from "./styles/analytics.css?url";
import type { loader as analyticsLoader } from "./app.analytics.server";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: analyticsStylesUrl },
];

// Fetch recent orders and compute top 5 products by quantity sold
type Granularity = "day" | "week" | "month";

function startOfWeek(d: Date) {
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = dt.getUTCDay(); // 0=Sun
  const diff = (dow + 6) % 7; // make Monday=0
  dt.setUTCDate(dt.getUTCDate() - diff);
  return dt;
}

function startOfMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function fmtYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function ErrorBoundary() {
  const error = useRouteError() as any;

  return (
    <Page>
      <TitleBar title="Analytics" />
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">Something went wrong</Text>
        <Text as="p" variant="bodyMd">{error?.message || "Unknown error"}</Text>
      </BlockStack>
    </Page>
  );
}

export default function AnalyticsPage() {
  const data = useLoaderData<typeof analyticsLoader>();
  const location = useLocation();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isNavLoading = navigation.state !== "idle";
  const [isExporting, setIsExporting] = useState(false);
  const [showTrendsHelp, setShowTrendsHelp] = useState(false);
  const [showBreakdownHelp, setShowBreakdownHelp] = useState(false);
  const [showSummaryHelp, setShowSummaryHelp] = useState(false);
  // Handle known error cases with helpful actions
  const errType = (data as any).error as string | undefined;
  if (errType === "ACCESS_DENIED") {
    const shop = (data as any).shop as string | undefined;
    const search = new URLSearchParams(location.search);
    const host = search.get("host") ?? undefined;
    // Point to our server route which will do a safe top-level redirect to /auth
    const base = shop ? `/app/reauth?shop=${encodeURIComponent(shop)}&reinstall=1` : "/app/reauth";
    const reauthUrl = host ? `${base}&host=${encodeURIComponent(host)}` : base;

    const redirectTop = () => {
      // Force a top-level redirect; works inside the embedded iframe
      if (typeof window !== "undefined" && window.top) {
        try {
          (window.top as Window).location.assign(reauthUrl);
          return;
        } catch (e) {
          // fall through to link below
        }
      }
      // Fallback: navigate current frame
      window.location.assign(reauthUrl);
    };

    return (
      <Page>
        <TitleBar title="Analytics" />
        <BlockStack gap="400">
          <Text as="p" variant="bodyMd">
            {(data as any).message}
          </Text>
          <Button onClick={redirectTop} variant="primary">
            Reauthorize app
          </Button>
          <Text as="p" variant="bodySm">
            If the button above doesn't work, try this link: <Link url={reauthUrl}>Open auth</Link>
          </Text>
          <Text as="p" variant="bodySm">
            Or open auth in the top window: {" "}
            <a href={reauthUrl} target="_top" rel="noreferrer">Open auth (top)</a>
          </Text>
        </BlockStack>
      </Page>
    );
  }

  const topProducts = Array.isArray((data as any).topProducts)
    ? ((data as any).topProducts as Array<{ id: string; title: string; quantity: number }>)
    : [];
  const series = Array.isArray((data as any).series)
    ? ((data as any).series as Array<{ key: string; label: string; quantity: number; sales: number }>)
    : [];
  type Filters = { start: string; end: string; granularity: string; preset: string; view?: string; compare?: string; chart?: string; compareScope?: string; metric?: string; chartScope?: string; productFocus?: string; momA?: string; momB?: string; yoyA?: string; yoyB?: string; yoyMode?: string; yoyYearA?: string; yoyYearB?: string; yoyYtd?: string };
  const filters = (data as any).filters as Filters | undefined;
  const topBySales = Array.isArray((data as any).topProductsBySales)
    ? ((data as any).topProductsBySales as Array<{ id: string; title: string; sales: number }>)
    : [];
  const productLegend = Array.isArray((data as any).productLegend)
    ? ((data as any).productLegend as Array<{ id: string; title: string }>)
    : [];
  const seriesProduct = Array.isArray((data as any).seriesProduct)
    ? ((data as any).seriesProduct as Array<{ key: string; label: string; per: Record<string, { qty: number; sales: number; title: string }> }>)
    : [];
  const seriesProductLines = Array.isArray((data as any).seriesProductLines)
    ? ((data as any).seriesProductLines as Array<{ id: string; title: string; points: Array<{ key: string; label: string; qty: number; sales: number }> }>)
    : [];
  const totals = (data as any).totals as { qty: number; sales: number; currency?: string } | undefined;
  const comparison = (data as any).comparison as {
    mode: string;
    current: { qty: number; sales: number };
    previous: { qty: number; sales: number };
    deltas: {
      qty: number;
      qtyPct: number | null;
      sales: number;
      salesPct: number | null;
    };
    prevRange: { start: string; end: string };
  } | undefined;
  const comparisonTable = Array.isArray((data as any).comparisonTable)
    ? ((data as any).comparisonTable as Array<Record<string, any>>)
    : [];
  const comparisonHeaders = Array.isArray((data as any).comparisonHeaders)
    ? ((data as any).comparisonHeaders as string[])
    : [];
  const momMonths = Array.isArray((data as any).momMonths)
    ? ((data as any).momMonths as Array<{ key: string; label: string }>)
    : [];
  const yoyPrevMonths = Array.isArray((data as any).yoyPrevMonths)
    ? ((data as any).yoyPrevMonths as Array<{ key: string; label: string }>)
    : [];
  const yoyCurrMonths = Array.isArray((data as any).yoyCurrMonths)
    ? ((data as any).yoyCurrMonths as Array<{ key: string; label: string }>)
    : [];

  // Build comparison headings on client when explicit months are selected
  const monthLabelClient = (ym?: string) => {
    if (!ym) return '';
    const parts = ym.split('-');
    if (parts.length !== 2) return ym;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!y || !m) return ym;
    const d = new Date(Date.UTC(y, m - 1, 1));
    return `${d.toLocaleString('en-US', { month: 'short' })} ${y}`;
  };
  const clientComparisonHeaders: string[] | null = (() => {
    if (!filters) return null;
    // MoM explicit
    if ((!filters.compare || filters.compare === 'mom') && filters.momA && filters.momB) {
      const la = monthLabelClient(filters.momA);
      const lb = monthLabelClient(filters.momB);
      if (filters.compareScope === 'product') {
        return [
          `Product (${la} → ${lb})`,
          `Qty (${lb})`, `Qty (${la})`, 'Qty Δ', 'Qty Δ%',
          `Sales (${lb})`, `Sales (${la})`, 'Sales Δ', 'Sales Δ%'
        ];
      } else {
        return [
          'Period',
          `Qty (${lb})`, `Qty (${la})`, 'Qty Δ', 'Qty Δ%',
          `Sales (${lb})`, `Sales (${la})`, 'Sales Δ', 'Sales Δ%'
        ];
      }
    }
    // YoY explicit
    if (filters.compare === 'yoy' && filters.yoyA && filters.yoyB) {
      const la = monthLabelClient(filters.yoyA);
      const lb = monthLabelClient(filters.yoyB);
      if (filters.compareScope === 'product') {
        return [
          `Product (${la} → ${lb})`,
          `Qty (${lb})`, `Qty (${la})`, 'Qty Δ', 'Qty Δ%',
          `Sales (${lb})`, `Sales (${la})`, 'Sales Δ', 'Sales Δ%'
        ];
      } else {
        return [
          'Period',
          `Qty (${lb})`, `Qty (${la})`, 'Qty Δ', 'Qty Δ%',
          `Sales (${lb})`, `Sales (${la})`, 'Sales Δ', 'Sales Δ%'
        ];
      }
    }
    return null;
  })();

  // Fallback just for YoY + By Product: if client/server headers miss, derive from current inputs
  const productYoyHeadingsFallback: string[] | null = (() => {
    if (filters?.compare === 'yoy' && filters?.compareScope === 'product') {
      const a = filters.yoyA || '';
      const b = filters.yoyB || '';
      if (a && b) {
        const la = monthLabelClient(a);
        const lb = monthLabelClient(b);
        return [
          `Product (${la} → ${lb})`,
          `Qty (${lb})`, `Qty (${la})`, 'Qty Δ', 'Qty Δ%',
          `Sales (${lb})`, `Sales (${la})`, 'Sales Δ', 'Sales Δ%'
        ];
      }
    }
    return null;
  })();

  // Table data (for Table view)
  const headers = Array.isArray((data as any).headers)
    ? ((data as any).headers as Array<{ id: string; title: string }>)
    : [];
  const tableData = Array.isArray((data as any).table)
    ? ((data as any).table as Array<Record<string, any>>)
    : [];

  // Precompute strongly-typed table config for Polaris DataTable
  const tableColumnTypes: ("text" | "numeric")[] = [
    "text",
    ...headers.map(() => "numeric" as const),
  ];
  const tableHeadings: string[] = [
    "Time Period",
    ...headers.map((h) => h.title),
  ];
  const tableRows: string[][] = tableData.map((r) => [
    String(r.label ?? r.key ?? ""),
    ...headers.map((h) => String(r[h.id] ?? 0)),
  ]);

  const rows = topProducts.map((p, idx) => [String(idx + 1), p.title, String(p.quantity)]);

  // Compute simple bar visualization values
  const maxQ = series.reduce((m, s) => Math.max(m, s.quantity), 0) || 1;
  const visBars = series.map((s) => ({ label: s.label, pct: Math.round((s.quantity / maxQ) * 100), qty: s.quantity }));

  // Formatting helpers
  const fmtNum = (n: number | null | undefined) => {
    const v = Number(n ?? 0);
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(v);
  };
  const fmtMoney = (n: number | null | undefined) => {
    const v = Number(n ?? 0);
    const formatted = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v);
    return totals?.currency ? `${totals.currency} ${formatted}` : formatted;
  };
  const fmtPct = (n: number | null | undefined) => (n == null ? "–" : `${n.toFixed(1)}%`);

  // Filter form handlers
  const onFilterChange = (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    const form = e?.currentTarget ?? (document.getElementById("filters-form") as HTMLFormElement | null);
    if (!form) return;
    const formData = new FormData(form);
    submit(formData, { method: "get" });
  };
  const changeView = (view: string) => {
    const form = document.getElementById("filters-form") as HTMLFormElement | null;
    const fd = form ? new FormData(form) : new FormData();
    fd.set("view", view);
    submit(fd, { method: "get" });
  };
  const changeChart = (type: string) => {
    const form = document.getElementById("filters-form") as HTMLFormElement | null;
    const fd = form ? new FormData(form) : new FormData();
    fd.set("view", "chart");
    fd.set("chart", type);
    if (!(fd.get("metric"))) fd.set("metric", (filters?.metric as string) || "qty");
    if (!(fd.get("chartScope"))) fd.set("chartScope", (filters?.chartScope as string) || "aggregate");
    submit(fd, { method: "get" });
  };
  const changeCompare = (mode: string) => {
    const form = document.getElementById("filters-form") as HTMLFormElement | null;
    const fd = form ? new FormData(form) : new FormData();
    fd.set("compare", mode);
    fd.set("view", "compare");
    submit(fd, { method: "get" });
  };
  const applyPatch = (patch: Record<string, string>) => {
    const form = document.getElementById("filters-form") as HTMLFormElement | null;
    const fd = form ? new FormData(form) : new FormData();
    for (const [k, v] of Object.entries(patch)) fd.set(k, v);
    submit(fd, { method: "get" });
  };

  // Build export URL with current filters and open in a new tab
  const exportWorkbook = () => {
    console.log("[ANALYTICS] Export button clicked");
    setIsExporting(true);
    const form = document.getElementById("filters-form") as HTMLFormElement | null;
    const fd = form ? new FormData(form) : new FormData();
    console.log("[ANALYTICS] Form data collected");
    
    // Ensure compare/momA/momB/compareScope persist
    if (!fd.get("view")) fd.set("view", filters?.view || "chart");
    if (!fd.get("compare")) fd.set("compare", filters?.compare || "none");
    if (!fd.get("compareScope")) fd.set("compareScope", filters?.compareScope || "aggregate");
    if (filters?.momA) fd.set("momA", filters.momA);
    if (filters?.momB) fd.set("momB", filters.momB);
    if (filters?.yoyA) fd.set("yoyA", filters.yoyA);
    if (filters?.yoyB) fd.set("yoyB", filters.yoyB);
    if (filters?.yoyMode) fd.set("yoyMode", filters.yoyMode);
    if (filters?.yoyYearA) fd.set("yoyYearA", filters.yoyYearA);
    if (filters?.yoyYearB) fd.set("yoyYearB", filters.yoyYearB);
    if (filters?.yoyYtd) fd.set("yoyYtd", filters.yoyYtd);
    
    const params = new URLSearchParams();
    for (const [k, v] of fd.entries()) {
      if (typeof v === "string" && v !== "") params.set(k, v);
    }
    params.set("format", "xlsx");
    const href = `/app/analytics/export?${params.toString()}`;
    
    console.log("[ANALYTICS] Export URL:", href);
    console.log("[ANALYTICS] Filters being exported:", {
      start: params.get("start"),
      end: params.get("end"),
      granularity: params.get("granularity"),
      view: params.get("view"),
      metric: params.get("metric"),
    });
    
    // Open in same window to preserve session/cookies
    console.log("[ANALYTICS] Redirecting to export endpoint...");
    window.location.href = href;
    
    // Brief loading indicator
    window.setTimeout(() => {
      console.log("[ANALYTICS] Export timeout - resetting loading state");
      setIsExporting(false);
    }, 1500);
  };

  // Chart rendering helpers
  const valueGetter = (d: any) => (filters?.metric === 'sales' ? d.sales : d.quantity);
  const chartType = (filters?.chart as string) || "bar";
  const svgPadding = { top: 20, right: 24, bottom: 40, left: 40 };
  const svgW = Math.max(560, 48 + series.length * 80);
  const svgH = 260;
  const innerW = svgW - svgPadding.left - svgPadding.right;
  const innerH = svgH - svgPadding.top - svgPadding.bottom;
  const yMaxQty = Math.max(1, ...series.map((s) => s.quantity));
  const yMaxSales = Math.max(1, ...series.map((s) => s.sales));
  const yMaxMetricChart = (filters?.metric === 'sales') ? yMaxSales : yMaxQty;
  const yScaleMChart = (v: number) => innerH - (v / yMaxMetricChart) * innerH;
  const xBandChart = (i: number) => (innerW / Math.max(1, series.length)) * i + (innerW / Math.max(1, series.length)) / 2;
  const colorPalette = ["#5c6ac4", "#47c1bf", "#f49342", "#bb86fc", "#9c6ade"];
  // Aliases to match JSX references below
  const yScaleM = yScaleMChart;
  const xBand = xBandChart;

  // Render the component based on view type
  return (
    <Page>
      <TitleBar title="Analytics" />
      <BlockStack gap="400">
        {/* Filters Card */}
        <div style={{ background: 'var(--p-color-bg-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--p-color-border)' }}>
          <Text as="h3" variant="headingSm" tone="subdued">Date Range & Filters</Text>
          <form id="filters-form" onSubmit={onFilterChange} style={{ marginTop: '16px' }}>
            <input type="hidden" name="view" defaultValue={filters?.view ?? "chart"} />
            <input type="hidden" name="compare" defaultValue={filters?.compare ?? "none"} />
            <input type="hidden" name="compareScope" defaultValue={filters?.compareScope ?? "aggregate"} />
            <input type="hidden" name="metric" defaultValue={filters?.metric ?? "qty"} />
            <input type="hidden" name="chartScope" defaultValue={filters?.chartScope ?? "aggregate"} />
            <input type="hidden" name="productFocus" defaultValue={filters?.productFocus ?? "all"} />
            <input type="hidden" name="yoyMode" defaultValue={filters?.yoyMode ?? "monthly"} />
            <input type="hidden" name="yoyYearA" defaultValue={filters?.yoyYearA ?? ""} />
            <input type="hidden" name="yoyYearB" defaultValue={filters?.yoyYearB ?? ""} />
            <input type="hidden" name="yoyYtd" defaultValue={filters?.yoyYtd ?? ""} />
            <InlineStack gap="300" wrap align="end">
              <div style={{ minWidth: '140px' }}>
                <Text as="span" variant="bodySm" tone="subdued">Time Period</Text>
                <select 
                  name="preset" 
                  defaultValue={filters?.preset ?? "last30"} 
                  style={{ width: '100%', marginTop: '4px', padding: '8px', border: '1px solid var(--p-color-border)', borderRadius: '6px' }}
                  onChange={(e) => {
                    const preset = e.target.value;
                    const now = new Date();
                    const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
                    const startInput = document.querySelector('input[name="start"]') as HTMLInputElement;
                    const endInput = document.querySelector('input[name="end"]') as HTMLInputElement;
                    
                    if (startInput && endInput) {
                      let start: Date, end: Date;
                      
                      switch (preset) {
                        case "last7":
                          end = utcNow;
                          start = new Date(utcNow);
                          start.setUTCDate(start.getUTCDate() - 6);
                          break;
                        case "last30":
                          end = utcNow;
                          start = new Date(utcNow);
                          start.setUTCDate(start.getUTCDate() - 29);
                          break;
                        case "thisMonth":
                          start = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), 1));
                          end = utcNow;
                          break;
                        case "lastMonth":
                          const firstThis = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), 1));
                          start = new Date(Date.UTC(firstThis.getUTCFullYear(), firstThis.getUTCMonth() - 1, 1));
                          end = new Date(Date.UTC(firstThis.getUTCFullYear(), firstThis.getUTCMonth(), 0));
                          break;
                        case "ytd":
                          start = new Date(Date.UTC(utcNow.getUTCFullYear(), 0, 1));
                          end = utcNow;
                          break;
                        default:
                          return; // Don't update for custom
                      }
                      
                      startInput.value = start.toISOString().slice(0, 10);
                      endInput.value = end.toISOString().slice(0, 10);
                    }
                  }}
                >
                  <option value="last7">Last 7 days</option>
                  <option value="last30">Last 30 days</option>
                  <option value="thisMonth">This month</option>
                  <option value="lastMonth">Last month</option>
                  <option value="ytd">Year to date</option>
                  <option value="custom">Custom range</option>
                </select>
              </div>
              <div style={{ minWidth: '120px' }}>
                <Text as="span" variant="bodySm" tone="subdued">Start Date</Text>
                <input name="start" type="date" defaultValue={filters?.start ?? ""} style={{ width: '100%', marginTop: '4px', padding: '8px', border: '1px solid var(--p-color-border)', borderRadius: '6px' }} />
              </div>
              <div style={{ minWidth: '120px' }}>
                <Text as="span" variant="bodySm" tone="subdued">End Date</Text>
                <input name="end" type="date" defaultValue={filters?.end ?? ""} style={{ width: '100%', marginTop: '4px', padding: '8px', border: '1px solid var(--p-color-border)', borderRadius: '6px' }} />
              </div>
              <div style={{ minWidth: '100px' }}>
                <Text as="span" variant="bodySm" tone="subdued">Group By</Text>
                <select name="granularity" defaultValue={(filters?.granularity as string) ?? "day"} style={{ width: '100%', marginTop: '4px', padding: '8px', border: '1px solid var(--p-color-border)', borderRadius: '6px' }}>
                  <option value="day">Daily</option>
                  <option value="week">Weekly</option>
                  <option value="month">Monthly</option>
                </select>
              </div>
              <Button submit variant="primary" disabled={isNavLoading} size="medium">Apply Filters</Button>
            </InlineStack>
            {isNavLoading && (
              <div style={{ marginTop: '12px' }}>
                <InlineStack gap="100" align="start">
                  <Spinner accessibilityLabel="Loading analytics" size="small" />
                  <Text as="span" variant="bodySm" tone="subdued">Updating data…</Text>
                </InlineStack>
              </div>
            )}
          </form>
        </div>

        {/* View Navigation */}
        <div style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
          padding: '4px', 
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(102, 126, 234, 0.15)'
        }}>
          <InlineStack gap="100">
            <div 
              onClick={() => changeView("chart")} 
              style={{
                padding: '12px 20px',
                borderRadius: '8px',
                background: filters?.view === "chart" || !filters?.view 
                  ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                cursor: isNavLoading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                border: 'none',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)',
                opacity: isNavLoading ? 0.6 : 1,
                boxShadow: filters?.view === "chart" || !filters?.view 
                  ? '0 4px 15px rgba(79, 172, 254, 0.4)' 
                  : 'none'
              }}
            >
              📊 Trends
            </div>
            <div 
              onClick={() => changeView("table")} 
              style={{
                padding: '12px 20px',
                borderRadius: '8px',
                background: filters?.view === "table" 
                  ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                cursor: isNavLoading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                border: 'none',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)',
                opacity: isNavLoading ? 0.6 : 1,
                boxShadow: filters?.view === "table" 
                  ? '0 4px 15px rgba(79, 172, 254, 0.4)' 
                  : 'none'
              }}
            >
              📋 Breakdown
            </div>
            <div 
              onClick={() => changeView("summary")} 
              style={{
                padding: '12px 20px',
                borderRadius: '8px',
                background: filters?.view === "summary" 
                  ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                cursor: isNavLoading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                border: 'none',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)',
                opacity: isNavLoading ? 0.6 : 1,
                boxShadow: filters?.view === "summary" 
                  ? '0 4px 15px rgba(79, 172, 254, 0.4)' 
                  : 'none'
              }}
            >
              📈 Summary
            </div>
            <div 
              onClick={() => changeView("compare")} 
              style={{
                padding: '12px 20px',
                borderRadius: '8px',
                background: filters?.view === "compare" 
                  ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                cursor: isNavLoading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                border: 'none',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)',
                opacity: isNavLoading ? 0.6 : 1,
                boxShadow: filters?.view === "compare" 
                  ? '0 4px 15px rgba(79, 172, 254, 0.4)' 
                  : 'none'
              }}
            >
              🔄 Compare
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <div 
                onClick={exportWorkbook}
                title="Export analytics data to Excel"
                style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  background: isExporting
                    ? 'linear-gradient(135deg, #c7c7c7 0%, #e0e0e0 100%)'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  cursor: isExporting ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  border: 'none',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)',
                  opacity: isExporting ? 0.6 : 1,
                  boxShadow: isExporting ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {isExporting ? '⏳ Exporting...' : '📥 Export Excel'}
              </div>
            </div>
          </InlineStack>
        </div>

        {/* Trends help tooltip (below tabs) */}
        {(!filters?.view || filters?.view === "chart") && (
          <div style={{ paddingTop: '8px', paddingBottom: '4px' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <span
                onMouseEnter={() => setShowTrendsHelp(true)}
                onMouseLeave={() => setShowTrendsHelp(false)}
                style={{
                  background: '#ff9800',
                  color: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: 12,
                  cursor: 'help',
                  border: '1px solid rgba(0,0,0,0.1)'
                }}
                aria-describedby="trends-readme-pop"
              >
                ℹ Read me
              </span>
              <div
                id="trends-readme-pop"
                role="tooltip"
                style={{
                  position: 'absolute',
                  top: '130%',
                  left: 0,
                  zIndex: 10,
                  width: 420,
                  background: 'white',
                  color: 'var(--p-color-text)',
                  border: '1px solid var(--p-color-border)',
                  borderRadius: 8,
                  padding: 12,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  display: showTrendsHelp ? 'block' : 'none'
                }}
              >
                <div style={{ marginBottom: 8 }}>
                  <Text as="p" variant="bodySm"><b>Trends</b></Text>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Text as="p" variant="bodyXs" tone="subdued">View how your store’s performance changes over time. Spot patterns, peaks, and dips so you know when to push harder or adjust.</Text>
                </div>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  <li><Text as="span" variant="bodyXs" tone="subdued"><b>Sales & Quantity</b> → Track daily, weekly, or monthly changes</Text></li>
                  <li><Text as="span" variant="bodyXs" tone="subdued"><b>Visual Insights</b> → Clear charts show growth or slowdowns</Text></li>
                </ul>
                <div style={{ marginTop: 8 }}>
                  <Text as="p" variant="bodyXs" tone="subdued">Use Trends to understand momentum — not just totals.</Text>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Breakdown help tooltip (below tabs) */}
        {filters?.view === "table" && (
          <div style={{ paddingTop: '8px', paddingBottom: '4px' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <span
                onMouseEnter={() => setShowBreakdownHelp(true)}
                onMouseLeave={() => setShowBreakdownHelp(false)}
                style={{
                  background: '#ff9800',
                  color: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: 12,
                  cursor: 'help',
                  border: '1px solid rgba(0,0,0,0.1)'
                }}
                aria-describedby="breakdown-readme-pop"
              >
                ℹ Read me
              </span>
              <div
                id="breakdown-readme-pop"
                role="tooltip"
                style={{
                  position: 'absolute',
                  top: '130%',
                  left: 0,
                  zIndex: 10,
                  width: 420,
                  background: 'white',
                  color: 'var(--p-color-text)',
                  border: '1px solid var(--p-color-border)',
                  borderRadius: 8,
                  padding: 12,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  display: showBreakdownHelp ? 'block' : 'none'
                }}
              >
                <div style={{ marginBottom: 8 }}>
                  <Text as="p" variant="bodySm"><b>Breakdown</b></Text>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Text as="p" variant="bodyXs" tone="subdued">See detailed performance by product within the date range you select. Group results daily, weekly, or monthly to fit how you track sales.</Text>
                </div>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  <li><Text as="span" variant="bodyXs" tone="subdued"><b>By Product</b> → Spot top performers and slow movers</Text></li>
                  <li><Text as="span" variant="bodyXs" tone="subdued"><b>By Date Range</b> → Drill into specific periods with custom filters</Text></li>
                </ul>
                <div style={{ marginTop: 8 }}>
                  <Text as="p" variant="bodyXs" tone="subdued">Use this view for precise tracking and to answer “what sold, and when.”</Text>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chart view */}
        {(!filters?.view || filters?.view === "chart") && (
          <>
            <div style={{ background: 'var(--p-color-bg-surface)', padding: '24px', borderRadius: '12px', border: '1px solid var(--p-color-border)' }}>
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">{(filters?.metric || 'qty') === 'sales' ? '💰 Sales' : '📦 Quantity'} Analytics</Text>
                  <Text as="span" variant="bodySm" tone="subdued">
                    {filters?.start && filters?.end ? `${filters.start} to ${filters.end}` : 'Select date range above'}
                  </Text>
                </InlineStack>
                
                <InlineStack gap="300" wrap>
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                      <Text as="span" variant="bodySm" tone="subdued">Metric</Text>
                    </div>
                    <div style={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                      padding: '3px', 
                      borderRadius: '8px',
                      boxShadow: '0 2px 10px rgba(102, 126, 234, 0.15)'
                    }}>
                      <InlineStack gap="100">
                        <div 
                          onClick={() => applyPatch({ view: 'chart', metric: 'qty' })} 
                          style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            background: (filters?.metric || 'qty') === 'qty' 
                              ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' 
                              : 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            cursor: isNavLoading ? 'not-allowed' : 'pointer',
                            fontWeight: '600',
                            fontSize: '13px',
                            transition: 'all 0.3s ease',
                            opacity: isNavLoading ? 0.6 : 1,
                            boxShadow: (filters?.metric || 'qty') === 'qty' 
                              ? '0 2px 8px rgba(79, 172, 254, 0.4)' 
                              : 'none'
                          }}
                        >
                          📦 Quantity
                        </div>
                        <div 
                          onClick={() => applyPatch({ view: 'chart', metric: 'sales' })} 
                          style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            background: (filters?.metric || 'qty') === 'sales' 
                              ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' 
                              : 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            cursor: isNavLoading ? 'not-allowed' : 'pointer',
                            fontWeight: '600',
                            fontSize: '13px',
                            transition: 'all 0.3s ease',
                            opacity: isNavLoading ? 0.6 : 1,
                            boxShadow: (filters?.metric || 'qty') === 'sales' 
                              ? '0 2px 8px rgba(79, 172, 254, 0.4)' 
                              : 'none'
                          }}
                        >
                          💰 Sales
                        </div>
                      </InlineStack>
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                      <Text as="span" variant="bodySm" tone="subdued">View</Text>
                    </div>
                    <div style={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                      padding: '3px', 
                      borderRadius: '8px',
                      boxShadow: '0 2px 10px rgba(102, 126, 234, 0.15)'
                    }}>
                      <InlineStack gap="100">
                        <div 
                          onClick={() => applyPatch({ view: 'chart', chartScope: 'aggregate' })} 
                          style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            background: (filters?.chartScope || 'aggregate') === 'aggregate' 
                              ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' 
                              : 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            cursor: isNavLoading ? 'not-allowed' : 'pointer',
                            fontWeight: '600',
                            fontSize: '13px',
                            transition: 'all 0.3s ease',
                            opacity: isNavLoading ? 0.6 : 1,
                            boxShadow: (filters?.chartScope || 'aggregate') === 'aggregate' 
                              ? '0 2px 8px rgba(79, 172, 254, 0.4)' 
                              : 'none'
                          }}
                        >
                          📊 Total
                        </div>
                        <div 
                          onClick={() => applyPatch({ view: 'chart', chartScope: 'product' })} 
                          style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            background: filters?.chartScope === 'product' 
                              ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' 
                              : 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            cursor: isNavLoading ? 'not-allowed' : 'pointer',
                            fontWeight: '600',
                            fontSize: '13px',
                            transition: 'all 0.3s ease',
                            opacity: isNavLoading ? 0.6 : 1,
                            boxShadow: filters?.chartScope === 'product' 
                              ? '0 2px 8px rgba(79, 172, 254, 0.4)' 
                              : 'none'
                          }}
                        >
                          🏷️ By Product
                        </div>
                      </InlineStack>
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                      <Text as="span" variant="bodySm" tone="subdued">Chart Type</Text>
                    </div>
                    <div style={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                      padding: '3px', 
                      borderRadius: '8px',
                      boxShadow: '0 2px 10px rgba(102, 126, 234, 0.15)'
                    }}>
                      <InlineStack gap="100">
                        <div 
                          onClick={() => changeChart("bar")} 
                          style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            background: chartType === "bar" 
                              ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' 
                              : 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            cursor: isNavLoading ? 'not-allowed' : 'pointer',
                            fontWeight: '600',
                            fontSize: '13px',
                            transition: 'all 0.3s ease',
                            opacity: isNavLoading ? 0.6 : 1,
                            boxShadow: chartType === "bar" 
                              ? '0 2px 8px rgba(79, 172, 254, 0.4)' 
                              : 'none'
                          }}
                        >
                          📊 Bar
                        </div>
                        <div 
                          onClick={() => changeChart("line")} 
                          style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            background: chartType === "line" 
                              ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' 
                              : 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            cursor: isNavLoading ? 'not-allowed' : 'pointer',
                            fontWeight: '600',
                            fontSize: '13px',
                            transition: 'all 0.3s ease',
                            opacity: isNavLoading ? 0.6 : 1,
                            boxShadow: chartType === "line" 
                              ? '0 2px 8px rgba(79, 172, 254, 0.4)' 
                              : 'none'
                          }}
                        >
                          📈 Line
                        </div>
                      </InlineStack>
                    </div>
                  </div>
                </InlineStack>
              </BlockStack>
              {series.length === 0 ? (
                <Text as="p" variant="bodyMd">No data in range.</Text>
              ) : (
                <>
                <div className="analytics-chart-scroll">
                  <svg width={svgW} height={svgH} role="img" aria-label="Chart">
                    {/* Axes */}
                    <g transform={`translate(${svgPadding.left},${svgPadding.top})`}>
                      {/* Y axis */}
                      <line x1={0} y1={0} x2={0} y2={innerH} stroke="#d0d4d9" />
                      {/* Y ticks */}
                      {Array.from({ length: 5 }).map((_, i) => {
                        const valueGetter = (d: any) => (filters?.metric === 'sales' ? d.sales : d.quantity);
                        const maxVal = Math.max(1, ...series.map(valueGetter));
                        const v = (maxVal / 4) * i;
                        const y = yScaleM(v);
                        return (
                          <g key={i}>
                            <line x1={-4} y1={y} x2={0} y2={y} stroke="#aeb4bb" />
                            <text x={-8} y={y + 4} textAnchor="end" fontSize={10} fill="#6b7177">{Math.round(v)}</text>
                            <line x1={0} y1={y} x2={innerW} y2={y} stroke="#f1f3f5" />
                          </g>
                        );
                      })}
                      {/* X axis */}
                      <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke="#d0d4d9" />
                      {series.map((s, i) => (
                        <text key={s.key} x={xBand(i)} y={innerH + 16} textAnchor="middle" fontSize={10} fill="#6b7177">{s.label}</text>
                      ))}

                      {/* Bars or Line */}
                      {chartType === "bar" && (
                        (filters?.chartScope === 'product'
                          ? (
                              // Stacked bars for top 5 products
                              series.map((s, i) => {
                                const cx = xBand(i);
                                const barW = Math.max(22, innerW / Math.max(1, series.length) * 0.5);
                                let yCursor = innerH;
                                const per = ((data as any).seriesProduct as any[]).find((x) => x.key === s.key)?.per || {};
                                const allLegend = ((data as any).productLegend as any[]) || [];
                                const legend = (filters?.productFocus && filters.productFocus !== 'all')
                                  ? allLegend.filter((lg: any) => lg.id === filters.productFocus)
                                  : allLegend;
                                const colors = ["#5c6ac4", "#47c1bf", "#f49342", "#bb86fc", "#9c6ade"]; // 5 colors
                                return (
                                  <g key={s.key}>
                                    {legend.map((lg: any, idx: number) => {
                                      const val = per[lg.id] ? (filters?.metric === 'sales' ? per[lg.id].sales : per[lg.id].qty) : 0;
                                      const h = innerH - yScaleM(val);
                                      yCursor -= h;
                                      return (
                                        <rect key={lg.id}
                                          x={cx - barW / 2}
                                          y={yCursor}
                                          width={barW}
                                          height={h}
                                          fill={colors[idx % colors.length]}
                                        >
                                          <title>{`${s.label} • ${lg.title}: ${filters?.metric === 'sales' ? fmtMoney(val) : fmtNum(val)}`}</title>
                                        </rect>
                                      );
                                    })}
                                  </g>
                                );
                              })
                            )
                          : (
                              // Aggregate single bar
                              series.map((s, i) => {
                                const cx = xBand(i);
                                const barW = Math.max(22, innerW / Math.max(1, series.length) * 0.5);
                                const val = (filters?.metric === 'sales' ? s.sales : s.quantity);
                                const h = innerH - yScaleM(val);
                                return (
                                  <rect key={s.key}
                                    x={cx - barW / 2}
                                    y={yScaleM(val)}
                                    width={barW}
                                    height={h}
                                    rx={4}
                                    fill="#5c6ac4"
                                  >
                                    <title>{`${s.label}: ${filters?.metric === 'sales' ? fmtMoney(val) : fmtNum(val)}`}</title>
                                  </rect>
                                );
                              })
                            ))
                      )}

                

                      {chartType === "line" && (
                        <>
                          {filters?.chartScope === 'product'
                            ? (
                                // Multiple product lines (optionally focused)
                                seriesProductLines
                                  .filter((pl) => !filters?.productFocus || filters.productFocus === 'all' || pl.id === filters.productFocus)
                                  .map((pl, idx) => (
                                  <g key={pl.id}>
                                    <polyline
                                      fill="none"
                                      stroke={colorPalette[idx % colorPalette.length]}
                                      strokeWidth={2}
                                      points={pl.points.map((pt, i) => {
                                        const val = (filters?.metric === 'sales' ? pt.sales : pt.qty);
                                        return `${xBand(i)},${yScaleM(val)}`;
                                      }).join(' ')}
                                    />
                                    {pl.points.map((pt, i) => {
                                      const val = (filters?.metric === 'sales' ? pt.sales : pt.qty);
                                      return <circle key={`${pl.id}-${pt.key}`} cx={xBand(i)} cy={yScaleM(val)} r={3} fill={colorPalette[idx % colorPalette.length]}>
                                        <title>{`${pt.label} • ${pl.title}: ${filters?.metric === 'sales' ? fmtMoney(val) : fmtNum(val)}`}</title>
                                      </circle>;
                                    })}
                                  </g>
                                ))
                              )
                            : (
                                // Single aggregate line
                                <>
                                  <polyline
                                    fill="none"
                                    stroke="#5c6ac4"
                                    strokeWidth={2}
                                    points={series.map((s, i) => {
                                      const val = (filters?.metric === 'sales' ? s.sales : s.quantity);
                                      return `${xBand(i)},${yScaleM(val)}`;
                                    }).join(" ")}
                                  />
                                  {series.map((s, i) => {
                                    const val = (filters?.metric === 'sales' ? s.sales : s.quantity);
                                    return <circle key={s.key} cx={xBand(i)} cy={yScaleM(val)} r={3} fill="#5c6ac4">
                                      <title>{`${s.label}: ${filters?.metric === 'sales' ? fmtMoney(val) : fmtNum(val)}`}</title>
                                    </circle>;
                                  })}
                                </>
                              )}
                        </>
                      )}
                    </g>
                  </svg>
                </div>
                {/* Product focus (beneath chart) - dropdown only */}
                {filters?.chartScope === 'product' && productLegend.length > 0 && (
                  <div className="analytics-legend">
                    <label className="inline-label">
                      <span className="legend-label">Show only</span>
                      <select defaultValue={filters?.productFocus ?? 'all'} onChange={(e) => applyPatch({ view: 'chart', productFocus: e.currentTarget.value })}>
                        <option value="all">All products</option>
                        {productLegend.map((p) => (
                          <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
                </>
              )}
            </div>
          </>
        )}

        {/* Table view */}
        {filters?.view === "table" && (
          <>
            <DataTable
              columnContentTypes={tableColumnTypes}
              headings={tableHeadings}
              rows={tableRows}
            />
          </>
        )}

        {/* Summary view */}
        {filters?.view === "summary" && (
          <>
            <div style={{ background: 'var(--p-color-bg-surface)', padding: '24px', borderRadius: '12px', border: '1px solid var(--p-color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text as="h2" variant="headingMd">Summary</Text>
                <div style={{ position: 'relative' }}>
                  <span
                    onMouseEnter={() => setShowSummaryHelp(true)}
                    onMouseLeave={() => setShowSummaryHelp(false)}
                    style={{
                      background: '#ff9800',
                      color: '#ffffff',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontSize: 12,
                      cursor: 'help',
                      border: '1px solid rgba(0,0,0,0.1)'
                    }}
                    aria-describedby="summary-readme-pop"
                  >
                    ℹ Read me
                  </span>
                  <div
                    id="summary-readme-pop"
                    role="tooltip"
                    style={{
                      position: 'absolute',
                      top: '130%',
                      right: 0,
                      zIndex: 10,
                      width: 420,
                      background: 'white',
                      color: 'var(--p-color-text)',
                      border: '1px solid var(--p-color-border)',
                      borderRadius: 8,
                      padding: 12,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      display: showSummaryHelp ? 'block' : 'none'
                    }}
                  >
                    <div style={{ marginBottom: 8 }}>
                      <Text as="p" variant="bodySm"><b>Summary</b></Text>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <Text as="p" variant="bodyXs" tone="subdued">See the big picture of your store’s performance at a glance.</Text>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      <li><Text as="span" variant="bodyXs" tone="subdued"><b>Totals</b> → Sales and quantities across your selected date range</Text></li>
                      <li><Text as="span" variant="bodyXs" tone="subdued"><b>Top Products</b> → Which items are driving the most revenue and volume</Text></li>
                    </ul>
                    <div style={{ marginTop: 8 }}>
                      <Text as="p" variant="bodyXs" tone="subdued">Use Overview as your starting point to quickly understand how the store is doing overall.</Text>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <Text as="p" variant="bodyMd">Total quantity: {fmtNum(totals?.qty)}</Text>
                <Text as="p" variant="bodyMd">Total sales: {fmtMoney(totals?.sales)}</Text>
              </div>
            </div>

            <Text as="h3" variant="headingSm" tone="subdued">Top 10 products by quantity</Text>
            <DataTable
              columnContentTypes={["numeric", "text", "numeric"]}
              headings={["#", "Product", "Qty"]}
              rows={topProducts.map((p, i) => [String(i + 1), p.title, String(p.quantity)])}
            />

            <Text as="h3" variant="headingSm" tone="subdued">Top 10 products by sales</Text>
            <DataTable
              columnContentTypes={["numeric", "text", "numeric"]}
              headings={["#", "Product", "Sales"]}
              rows={topBySales.map((p, i) => [String(i + 1), p.title, fmtMoney(p.sales)])}
            />
          </>
        )}

        {/* Comparison view */}
        {filters?.view === "compare" && (
          <>
            <div style={{ background: 'var(--p-color-bg-surface)', padding: '24px', borderRadius: '12px', border: '1px solid var(--p-color-border)' }}>
              <BlockStack gap="400">
                <div>
                  <Text as="h2" variant="headingMd">🔄 Comparison Analysis</Text>
                  <Text as="p" variant="bodySm" tone="subdued">Compare performance across time periods and products</Text>
                </div>
                
                <InlineStack gap="300" wrap>
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                      <Text as="span" variant="bodySm" tone="subdued">Comparison Type</Text>
                    </div>
                    <div style={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                      padding: '3px', 
                      borderRadius: '8px',
                      boxShadow: '0 2px 10px rgba(102, 126, 234, 0.15)'
                    }}>
                      <InlineStack gap="100">
                        <div 
                          onClick={() => changeCompare('mom')} 
                          style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            background: (filters?.compare || 'mom') === 'mom' 
                              ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' 
                              : 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            cursor: isNavLoading ? 'not-allowed' : 'pointer',
                            fontWeight: '600',
                            fontSize: '13px',
                            transition: 'all 0.3s ease',
                            opacity: isNavLoading ? 0.6 : 1,
                            boxShadow: (filters?.compare || 'mom') === 'mom' 
                              ? '0 2px 8px rgba(79, 172, 254, 0.4)' 
                              : 'none'
                          }}
                        >
                          📅 Month-over-Month
                        </div>
                        <div 
                          onClick={() => changeCompare('yoy')} 
                          style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            background: filters?.compare === 'yoy' 
                              ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' 
                              : 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            cursor: isNavLoading ? 'not-allowed' : 'pointer',
                            fontWeight: '600',
                            fontSize: '13px',
                            transition: 'all 0.3s ease',
                            opacity: isNavLoading ? 0.6 : 1,
                            boxShadow: filters?.compare === 'yoy' 
                              ? '0 2px 8px rgba(79, 172, 254, 0.4)' 
                              : 'none'
                          }}
                        >
                          📆 Year-over-Year
                        </div>
                      </InlineStack>
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                      <Text as="span" variant="bodySm" tone="subdued">Scope</Text>
                    </div>
                    <div style={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                      padding: '3px', 
                      borderRadius: '8px',
                      boxShadow: '0 2px 10px rgba(102, 126, 234, 0.15)'
                    }}>
                      <InlineStack gap="100">
                        <div
                          onClick={() => applyPatch({ view: 'compare', compare: (filters?.compare as string) || 'mom', compareScope: 'aggregate', momA: filters?.momA || '', momB: filters?.momB || '', yoyA: filters?.yoyA || '', yoyB: filters?.yoyB || '' })}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            background: (filters?.compareScope || 'aggregate') === 'aggregate' 
                              ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' 
                              : 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            cursor: isNavLoading ? 'not-allowed' : 'pointer',
                            fontWeight: '600',
                            fontSize: '13px',
                            transition: 'all 0.3s ease',
                            opacity: isNavLoading ? 0.6 : 1,
                            boxShadow: (filters?.compareScope || 'aggregate') === 'aggregate' 
                              ? '0 2px 8px rgba(79, 172, 254, 0.4)' 
                              : 'none'
                          }}
                        >
                          📊 Overall Totals
                        </div>
                        <div
                          onClick={() => applyPatch({ view: 'compare', compare: (filters?.compare as string) || 'mom', compareScope: 'product', momA: filters?.momA || '', momB: filters?.momB || '', yoyA: filters?.yoyA || '', yoyB: filters?.yoyB || '' })}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            background: filters?.compareScope === 'product' 
                              ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' 
                              : 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            cursor: isNavLoading ? 'not-allowed' : 'pointer',
                            fontWeight: '600',
                            fontSize: '13px',
                            transition: 'all 0.3s ease',
                            opacity: isNavLoading ? 0.6 : 1,
                            boxShadow: filters?.compareScope === 'product' 
                              ? '0 2px 8px rgba(79, 172, 254, 0.4)' 
                              : 'none'
                          }}
                        >
                          🏷️ By Product
                        </div>
                      </InlineStack>
                    </div>
                  </div>
                </InlineStack>
                
                {(!filters?.compare || filters?.compare === 'mom') && (
                  <div style={{ background: 'var(--p-color-bg-surface-secondary)', padding: '16px', borderRadius: '8px' }}>
                    <Text as="span" variant="bodySm" tone="subdued">Month-over-Month Selection (independent of top date range)</Text>
                    <div style={{ marginTop: '8px' }}>
                      <InlineStack gap="200" wrap>
                        <div style={{ minWidth: '140px' }}>
                          <Text as="span" variant="bodySm">Year</Text>
                          <select id="momYear" defaultValue={new Date().getUTCFullYear().toString()} style={{ width: '100%', marginTop: '4px', padding: '8px', border: '1px solid var(--p-color-border)', borderRadius: '6px' }}>
                            {Array.from({ length: 6 }).map((_, i) => {
                              const y = new Date().getUTCFullYear() - i;
                              return <option key={y} value={y.toString()}>{y}</option>;
                            })}
                          </select>
                        </div>
                        <div style={{ minWidth: '140px' }}>
                          <Text as="span" variant="bodySm">Month A</Text>
                          <select id="momMonthA" defaultValue="" style={{ width: '100%', marginTop: '4px', padding: '8px', border: '1px solid var(--p-color-border)', borderRadius: '6px' }}>
                            <option value="">(auto-select)</option>
                            {Array.from({ length: 12 }).map((_, idx) => {
                              const m = idx + 1; const ml = new Date(Date.UTC(2000, idx, 1)).toLocaleString('en-US', { month: 'short' });
                              return <option key={m} value={String(m).padStart(2,'0')}>{ml}</option>;
                            })}
                          </select>
                        </div>
                        <div style={{ minWidth: '140px' }}>
                          <Text as="span" variant="bodySm">Month B</Text>
                          <select id="momMonthB" defaultValue="" style={{ width: '100%', marginTop: '4px', padding: '8px', border: '1px solid var(--p-color-border)', borderRadius: '6px' }}>
                            <option value="">(auto-select next)</option>
                            {Array.from({ length: 12 }).map((_, idx) => {
                              const m = idx + 1; const ml = new Date(Date.UTC(2000, idx, 1)).toLocaleString('en-US', { month: 'short' });
                              return <option key={m} value={String(m).padStart(2,'0')}>{ml}</option>;
                            })}
                          </select>
                        </div>
                        <div style={{ alignSelf: 'flex-end' }}>
                          <div onClick={() => {
                            const year = (document.getElementById('momYear') as HTMLSelectElement | null)?.value || '';
                            const ma = (document.getElementById('momMonthA') as HTMLSelectElement | null)?.value || '';
                            const mb = (document.getElementById('momMonthB') as HTMLSelectElement | null)?.value || '';
                            const a = ma ? `${year}-${ma}` : '';
                            const b = mb ? `${year}-${mb}` : '';
                            const scope = (filters?.compareScope as string) || 'aggregate';
                            applyPatch({ view: 'compare', compare: 'mom', compareScope: scope, momA: a, momB: b });
                          }} style={{
                            padding: '10px 20px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                            color: 'white',
                            cursor: isNavLoading ? 'not-allowed' : 'pointer',
                            fontWeight: '600',
                            fontSize: '14px',
                            border: 'none',
                            transition: 'all 0.3s ease',
                            opacity: isNavLoading ? 0.6 : 1,
                            boxShadow: '0 4px 15px rgba(79, 172, 254, 0.4)'
                          }}>
                            Update Comparison
                          </div>
                        </div>
                      </InlineStack>
                    </div>
                  </div>
                )}
                {filters?.compare === 'yoy' && (
                  <YoYControls filters={filters} isNavLoading={isNavLoading} applyPatch={applyPatch} />
                )}
                
                {isNavLoading && (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <InlineStack gap="100" align="center">
                      <Spinner accessibilityLabel="Loading comparison" size="small" />
                      <Text as="span" variant="bodySm" tone="subdued">Calculating comparison data…</Text>
                    </InlineStack>
                  </div>
                )}
              </BlockStack>
            </div>
            {!comparison && (
              <div style={{ background: 'var(--p-color-bg-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--p-color-border)', textAlign: 'center' }}>
                <Text as="p" variant="bodyMd" tone="subdued">
                  👆 Select a comparison type above (Month-over-Month or Year-over-Year) and scope (Overall Totals or By Product) to view comparison data.
                </Text>
                <div style={{ marginTop: '12px' }}>
                  <div 
                    onClick={() => changeCompare('mom')} 
                    style={{
                      display: 'inline-block',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '14px',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 15px rgba(79, 172, 254, 0.4)'
                    }}
                  >
                    🚀 Start with Month-over-Month
                  </div>
                </div>
              </div>
            )}
            {!!comparison && (
              <div>
                {filters?.compareScope === "aggregate" && filters?.compare === 'mom' && (
                  <div style={{ background: 'var(--p-color-bg-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--p-color-border)' }}>
                    <div style={{ marginBottom: '16px' }}>
                      <Text as="h3" variant="headingMd">📊 Month-over-Month Comparison</Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {filters?.momA && filters?.momB 
                          ? `Comparing ${momMonths.find(m => m.key === filters.momA)?.label || filters.momA} vs ${momMonths.find(m => m.key === filters.momB)?.label || filters.momB}`
                          : 'Showing consecutive month comparisons within your selected date range'
                        }
                      </Text>
                    </div>
                    <DataTable
                      columnContentTypes={["text","numeric","numeric","numeric","text","numeric","numeric","numeric","text"]}
                      headings={clientComparisonHeaders || comparisonHeaders || productYoyHeadingsFallback || ["Period","Qty (Curr)","Qty (Prev)","Qty Δ","Qty Δ%","Sales (Curr)","Sales (Prev)","Sales Δ","Sales Δ%"]}
                      rows={((data as any).comparisonTable as any[]).map((r: any) => [
                        r.period,
                        fmtNum(r.qtyCurr),
                        fmtNum(r.qtyPrev),
                        fmtNum(r.qtyDelta),
                        fmtPct(r.qtyDeltaPct),
                        fmtMoney(r.salesCurr),
                        fmtMoney(r.salesPrev),
                        fmtMoney(r.salesDelta),
                        fmtPct(r.salesDeltaPct),
                      ])}
                    />
                  </div>
                )}
                {filters?.compareScope === "aggregate" && filters?.compare === 'yoy' && (
                  <div style={{ background: 'var(--p-color-bg-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--p-color-border)' }}>
                    <div style={{ marginBottom: '20px' }}>
                      <Text as="h3" variant="headingMd">📆 Year-over-Year Comparison</Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Comparing each month in your selected period vs the same month in the previous year (e.g., Jan 2025 vs Jan 2024, Feb 2025 vs Feb 2024)
                      </Text>
                    </div>
                    
                    {/* YoY Summary Cards */}
                    {comparison && (
                      <div style={{ 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                        padding: '20px', 
                        borderRadius: '12px', 
                        marginBottom: '20px',
                        color: 'white'
                      }}>
                        {(() => {
                          const monthLabel = (ym?: string) => {
                            if (!ym) return '';
                            const [y, mm] = ym.split('-').map((x) => parseInt(x, 10));
                            if (!y || !mm) return ym;
                            const d = new Date(Date.UTC(y, mm - 1, 1));
                            return `${d.toLocaleString('en-US', { month: 'short' })} ${y}`;
                          };
                          const isYoYMonthly = (filters?.compare === 'yoy') && ((filters?.yoyMode || 'monthly') === 'monthly');
                          const summaryRange = (() => {
                            if (filters?.yoyA && filters?.yoyB) {
                              return `${monthLabel(filters.yoyB)} vs ${monthLabel(filters.yoyA)}`;
                            }
                            if (isYoYMonthly) {
                              const now = new Date();
                              const y = now.getUTCFullYear();
                              const m = now.getUTCMonth() + 1;
                              const curr = new Date(Date.UTC(y, m - 1, 1));
                              const prev = new Date(Date.UTC(y - 1, m - 1, 1));
                              const currLabel = `${curr.toLocaleString('en-US', { month: 'short' })} ${curr.getUTCFullYear()}`;
                              const prevLabel = `${prev.toLocaleString('en-US', { month: 'short' })} ${prev.getUTCFullYear()}`;
                              return `${currLabel} vs ${prevLabel} (Month-to-date)`;
                            }
                            return `${filters?.start} to ${filters?.end}`;
                          })();
                          return (
                            <div style={{ color: 'white', marginBottom: '16px' }}>
                              <Text as="h4" variant="headingSm">
                                📊 Period Summary: {summaryRange}
                              </Text>
                            </div>
                          );
                        })()}
                        <InlineStack gap="400" wrap>
                          <div style={{ 
                            background: 'rgba(255, 255, 255, 0.15)', 
                            padding: '16px', 
                            borderRadius: '8px',
                            backdropFilter: 'blur(10px)',
                            minWidth: '200px'
                          }}>
                            <div style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '4px' }}>
                              <Text as="p" variant="bodySm">📦 Total Quantity</Text>
                            </div>
                            <div style={{ color: 'white', marginBottom: '8px' }}>
                              <Text as="p" variant="headingLg">{fmtNum(comparison.current.qty)}</Text>
                            </div>
                            <div style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                              <Text as="p" variant="bodySm">vs {fmtNum(comparison.previous.qty)} last year</Text>
                            </div>
                            <div style={{ 
                              marginTop: '8px',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              background: comparison.deltas.qty >= 0 ? 'rgba(46, 213, 115, 0.3)' : 'rgba(231, 76, 60, 0.3)',
                              display: 'inline-block'
                            }}>
                              <span style={{ color: 'white', fontWeight: '600' }}>
                                <Text as="span" variant="bodySm">
                                  {comparison.deltas.qty >= 0 ? '↗️' : '↘️'} {fmtNum(Math.abs(comparison.deltas.qty))} ({comparison.deltas.qtyPct !== null ? fmtPct(Math.abs(comparison.deltas.qtyPct)) : '–'})
                                </Text>
                              </span>
                            </div>
                          </div>
                          
                          <div style={{ 
                            background: 'rgba(255, 255, 255, 0.15)', 
                            padding: '16px', 
                            borderRadius: '8px',
                            backdropFilter: 'blur(10px)',
                            minWidth: '200px'
                          }}>
                            <div style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '4px' }}>
                              <Text as="p" variant="bodySm">💰 Total Sales</Text>
                            </div>
                            <div style={{ color: 'white', marginBottom: '8px' }}>
                              <Text as="p" variant="headingLg">{fmtMoney(comparison.current.sales)}</Text>
                            </div>
                            <div style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                              <Text as="p" variant="bodySm">vs {fmtMoney(comparison.previous.sales)} last year</Text>
                            </div>
                            <div style={{ 
                              marginTop: '8px',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              background: comparison.deltas.sales >= 0 ? 'rgba(46, 213, 115, 0.3)' : 'rgba(231, 76, 60, 0.3)',
                              display: 'inline-block'
                            }}>
                              <span style={{ color: 'white', fontWeight: '600' }}>
                                <Text as="span" variant="bodySm">
                                  {comparison.deltas.sales >= 0 ? '↗️' : '↘️'} {fmtMoney(Math.abs(comparison.deltas.sales))} ({comparison.deltas.salesPct !== null ? fmtPct(Math.abs(comparison.deltas.salesPct)) : '–'})
                                </Text>
                              </span>
                            </div>
                          </div>
                        </InlineStack>
                      </div>
                    )}
                    {Array.isArray((data as any).comparisonTable) && (data as any).comparisonTable.length > 0 && !("metric" in (data as any).comparisonTable[0]) ? (
                      <DataTable
                        columnContentTypes={["text","numeric","numeric","numeric","text","numeric","numeric","numeric","text"]}
                        headings={clientComparisonHeaders || comparisonHeaders || productYoyHeadingsFallback || ["Period","Qty (Curr)","Qty (Prev)","Qty Δ","Qty Δ%","Sales (Curr)","Sales (Prev)","Sales Δ","Sales Δ%"]}
                        rows={(data as any).comparisonTable.map((r: any) => [
                          r.period,
                          fmtNum(r.qtyCurr),
                          fmtNum(r.qtyPrev),
                          fmtNum(r.qtyDelta),
                          fmtPct(r.qtyDeltaPct),
                          fmtMoney(r.salesCurr),
                          fmtMoney(r.salesPrev),
                          fmtMoney(r.salesDelta),
                          fmtPct(r.salesDeltaPct),
                        ])}
                      />
                    ) : (
                      <DataTable
                        columnContentTypes={["text","numeric","numeric","numeric","text"]}
                        headings={["Metric","Current","Previous","Change","% Change"]}
                        rows={(data as any).comparisonTable.map((r: any) => [
                          r.metric,
                          r.metric === "Sales" ? fmtMoney(r.current) : fmtNum(r.current),
                          r.metric === "Sales" ? fmtMoney(r.previous) : fmtNum(r.previous),
                          r.metric === "Sales" ? fmtMoney(r.change) : fmtNum(r.change),
                          typeof r.changePct === "string" ? r.changePct : fmtPct(r.changePct as number | null | undefined),
                        ])}
                      />
                    )}
                  </div>
                )}
                {filters?.compareScope === "product" && (
                  <div style={{ background: 'var(--p-color-bg-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--p-color-border)' }}>
                    <div style={{ marginBottom: '16px' }}>
                      <Text as="h3" variant="headingMd">🏷️ Product Comparison</Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {filters?.compare === 'yoy' 
                          ? 'Comparing each product\'s performance in your selected period vs the same period last year'
                          : filters?.momA && filters?.momB
                            ? `Comparing each product's performance: ${momMonths.find(m => m.key === filters.momA)?.label || filters.momA} vs ${momMonths.find(m => m.key === filters.momB)?.label || filters.momB}`
                            : 'Comparing each product\'s performance between consecutive months in your selected period'
                        }
                      </Text>
                    </div>
                    <div style={{ 
                      background: 'white', 
                      borderRadius: '8px', 
                      overflow: 'hidden',
                      border: '1px solid var(--p-color-border)'
                    }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        {(() => {
                          const prodHeadings = (clientComparisonHeaders || comparisonHeaders || productYoyHeadingsFallback || [
                            'Product',
                            'Qty (Curr)','Qty (Prev)','Qty Δ','Qty Δ%',
                            'Sales (Curr)','Sales (Prev)','Sales Δ','Sales Δ%'
                          ]);
                          return (
                            <thead>
                              <tr style={{ background: 'var(--p-color-bg-surface-secondary)' }}>
                                {prodHeadings.map((h, i) => (
                                  <th
                                    key={i}
                                    style={{ padding: '12px', textAlign: i === 0 ? 'left' : 'right', borderBottom: '1px solid var(--p-color-border)', fontWeight: '600', fontSize: '14px' }}
                                  >
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                          );
                        })()}
                        <tbody>
                          {((data as any).comparisonTable as any[]).map((r: any, index: number) => (
                            <tr key={index} style={{ borderBottom: '1px solid var(--p-color-border-subdued)' }}>
                              <td style={{ 
                                padding: '12px', 
                                borderBottom: '1px solid var(--p-color-border-subdued)',
                                position: 'relative',
                                cursor: r.productSku ? 'help' : 'default'
                              }}
                              title={r.productSku ? `SKU: ${r.productSku}` : undefined}
                              >
                                <div style={{ 
                                  display: 'flex', 
                                  alignItems: 'center',
                                  gap: '8px'
                                }}>
                                  <span style={{ fontWeight: '500' }}>{r.product}</span>
                                  {r.productSku && (
                                    <span style={{ 
                                      background: 'var(--p-color-bg-surface-secondary)',
                                      color: 'var(--p-color-text-subdued)',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontFamily: 'monospace'
                                    }}>
                                      {r.productSku}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--p-color-border-subdued)' }}>{fmtNum(r.qtyCurr)}</td>
                              <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--p-color-border-subdued)' }}>{fmtNum(r.qtyPrev)}</td>
                              <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--p-color-border-subdued)' }}>{fmtNum(r.qtyDelta)}</td>
                              <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--p-color-border-subdued)' }}>{fmtPct(r.qtyDeltaPct)}</td>
                              <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--p-color-border-subdued)' }}>{fmtMoney(r.salesCurr)}</td>
                              <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--p-color-border-subdued)' }}>{fmtMoney(r.salesPrev)}</td>
                              <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--p-color-border-subdued)' }}>{fmtMoney(r.salesDelta)}</td>
                              <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--p-color-border-subdued)' }}>{fmtPct(r.salesDeltaPct)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
            </>
            )}
            {errType && errType !== "ACCESS_DENIED" && (filters?.start && filters?.end) && (
              <div style={{ background: 'var(--p-color-bg-critical-subdued)', padding: '16px', borderRadius: '8px', border: '1px solid var(--p-color-border-critical)' }}>
                <Text as="p" variant="bodySm" tone="critical">
                  ⚠️ Error loading analytics: {(data as any).message || errType}
                </Text>
              </div>
            )}
            </BlockStack>
          </Page>
  );
}
