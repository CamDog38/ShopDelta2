import type { LinksFunction } from "@remix-run/node";
import { useLoaderData, useLocation, useRouteError, useSubmit, useNavigation } from "@remix-run/react";
import { useState } from "react";
import { Page, DataTable, BlockStack, Text, Link, Button, InlineStack, Spinner } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
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
  type Filters = { start: string; end: string; granularity: string; preset: string; view?: string; compare?: string; chart?: string; compareScope?: string; metric?: string; chartScope?: string; productFocus?: string; momA?: string; momB?: string };
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
    setIsExporting(true);
    const form = document.getElementById("filters-form") as HTMLFormElement | null;
    const fd = form ? new FormData(form) : new FormData();
    // Ensure compare/momA/momB/compareScope persist
    if (!fd.get("view")) fd.set("view", filters?.view || "chart");
    if (!fd.get("compare")) fd.set("compare", filters?.compare || "none");
    if (!fd.get("compareScope")) fd.set("compareScope", filters?.compareScope || "aggregate");
    if (filters?.momA) fd.set("momA", filters.momA);
    if (filters?.momB) fd.set("momB", filters.momB);
    const params = new URLSearchParams();
    for (const [k, v] of fd.entries()) {
      if (typeof v === "string" && v !== "") params.set(k, v);
    }
    params.set("format", "xlsx");
    const href = `/app/analytics/export?${params.toString()}`;
    // Create a temporary form targeting a new tab to ensure first-party cookie context
    const formEl = document.createElement('form');
    formEl.method = 'GET';
    formEl.action = href;
    formEl.target = '_blank';
    document.body.appendChild(formEl);
    formEl.submit();
    document.body.removeChild(formEl);
    // Brief loading indicator
    window.setTimeout(() => setIsExporting(false), 1500);
  };

  // Chart rendering helpers
  const valueGetter = (d: any) => (filters?.metric === 'sales' ? d.sales : d.quantity);
  const chartW = 800;
  const chartH = 400;
  const margin = { top: 20, right: 20, bottom: 60, left: 60 };
  const innerW = chartW - margin.left - margin.right;
  const innerH = chartH - margin.top - margin.bottom;
  const xBand = (i: number) => (innerW / Math.max(1, series.length)) * i + (innerW / Math.max(1, series.length)) / 2;
  const yMaxMetric = Math.max(...series.map((s) => valueGetter(s))) || 1;
  const yScaleM = (v: number) => innerH - (v / yMaxMetric) * innerH;

  // Render the component based on view type
  return (
    <Page>
      <TitleBar title="Analytics" />
      <BlockStack gap="500">
        {/* Filter form */}
        <form id="filters-form" onSubmit={onFilterChange}>
          {/* ... form content ... */}
        </form>

        {/* Main content based on view */}
        {isNavLoading ? (
          <InlineStack align="center">
            <Spinner size="small" />
            <Text as="p">Loading analytics data...</Text>
          </InlineStack>
        ) : (
          <>
            {/* View tabs */}
            <InlineStack gap="200" align="start">
              <Button
                onClick={() => changeView("chart")}
                variant={(filters?.view !== "table" && filters?.view !== "compare") ? "primary" : "tertiary"}
              >
                Chart
              </Button>
              <Button
                onClick={() => changeView("table")}
                variant={filters?.view === "table" ? "primary" : "tertiary"}
              >
                Table
              </Button>
              <Button
                onClick={() => changeView("compare")}
                variant={filters?.view === "compare" ? "primary" : "tertiary"}
              >
                Compare
              </Button>
              <div style={{ marginLeft: "auto" }}>
                <Button
                  onClick={exportWorkbook}
                  disabled={isExporting}
                  icon={isExporting ? <Spinner size="small" /> : undefined}
                >
                  Export
                </Button>
              </div>
            </InlineStack>

            {/* Chart view */}
            {filters?.view !== "table" && filters?.view !== "compare" && (
              <BlockStack gap="400">
                {/* Chart type selector */}
                <InlineStack gap="200" align="start">
                  <Button
                    onClick={() => changeChart("bar")}
                    variant={filters?.chart !== "line" ? "primary" : "tertiary"}
                    size="slim"
                  >
                    Bar
                  </Button>
                  <Button
                    onClick={() => changeChart("line")}
                    variant={filters?.chart === "line" ? "primary" : "tertiary"}
                    size="slim"
                  >
                    Line
                  </Button>
                  <div style={{ marginLeft: 20 }}>
                    <Button
                      onClick={() => applyPatch({ metric: "qty" })}
                      variant={filters?.metric !== "sales" ? "primary" : "tertiary"}
                      size="slim"
                    >
                      Quantity
                    </Button>
                    <Button
                      onClick={() => applyPatch({ metric: "sales" })}
                      variant={filters?.metric === "sales" ? "primary" : "tertiary"}
                      size="slim"
                    >
                      Sales
                    </Button>
                  </div>
                  <div style={{ marginLeft: 20 }}>
                    <Button
                      onClick={() => applyPatch({ chartScope: "aggregate" })}
                      variant={filters?.chartScope !== "product" ? "primary" : "tertiary"}
                      size="slim"
                    >
                      All Products
                    </Button>
                    <Button
                      onClick={() => applyPatch({ chartScope: "product" })}
                      variant={filters?.chartScope === "product" ? "primary" : "tertiary"}
                      size="slim"
                    >
                      By Product
                    </Button>
                  </div>
                </InlineStack>

                {/* Chart visualization */}
                {/* ... chart SVG or visualization ... */}
              </BlockStack>
            )}

            {/* Table view */}
            {filters?.view === "table" && (
              <DataTable
                columnContentTypes={["text", "text", "numeric"]}
                headings={["#", "Product", "Quantity"]}
                rows={rows}
              />
            )}

            {/* Compare view */}
            {filters?.view === "compare" && (
              <BlockStack gap="400">
                {/* Compare mode selector */}
                <InlineStack gap="200" align="start">
                  <Button
                    onClick={() => changeCompare("none")}
                    variant={filters?.compare === "none" ? "primary" : "tertiary"}
                    size="slim"
                  >
                    None
                  </Button>
                  <Button
                    onClick={() => changeCompare("mom")}
                    variant={filters?.compare === "mom" ? "primary" : "tertiary"}
                    size="slim"
                  >
                    Month-on-Month
                  </Button>
                  <Button
                    onClick={() => changeCompare("yoy")}
                    variant={filters?.compare === "yoy" ? "primary" : "tertiary"}
                    size="slim"
                  >
                    Year-on-Year
                  </Button>
                  {(filters?.compare === "mom" || filters?.compare === "yoy") && (
                    <div style={{ marginLeft: 20 }}>
                      <Button
                        onClick={() => applyPatch({ compareScope: "aggregate" })}
                        variant={filters?.compareScope !== "product" ? "primary" : "tertiary"}
                        size="slim"
                      >
                        Aggregate
                      </Button>
                      <Button
                        onClick={() => applyPatch({ compareScope: "product" })}
                        variant={filters?.compareScope === "product" ? "primary" : "tertiary"}
                        size="slim"
                      >
                        By Product
                      </Button>
                    </div>
                  )}
                </InlineStack>

                {/* Comparison summary */}
                {comparison && (
                  <BlockStack gap="400">
                    <InlineStack gap="500" align="start">
                      <BlockStack>
                        <Text as="h3" variant="headingMd">Current Period</Text>
                        <Text as="p">{filters?.start} to {filters?.end}</Text>
                        <Text as="p" variant="headingLg">{fmtNum(comparison.current.qty)}</Text>
                        <Text as="p">units sold</Text>
                        <Text as="p" variant="headingLg">{fmtMoney(comparison.current.sales)}</Text>
                        <Text as="p">total sales</Text>
                      </BlockStack>
                      <BlockStack>
                        <Text as="h3" variant="headingMd">Previous Period</Text>
                        <Text as="p">{comparison.prevRange.start} to {comparison.prevRange.end}</Text>
                        <Text as="p" variant="headingLg">{fmtNum(comparison.previous.qty)}</Text>
                        <Text as="p">units sold</Text>
                        <Text as="p" variant="headingLg">{fmtMoney(comparison.previous.sales)}</Text>
                        <Text as="p">total sales</Text>
                      </BlockStack>
                      <BlockStack>
                        <Text as="h3" variant="headingMd">Change</Text>
                        <Text as="p">&nbsp;</Text>
                        <Text as="p" variant="headingLg">
                          {comparison.deltas.qty > 0 ? "+" : ""}{fmtNum(comparison.deltas.qty)}
                          {" "}
                          <span style={{ color: comparison.deltas.qty > 0 ? "green" : (comparison.deltas.qty < 0 ? "red" : "inherit") }}>
                            ({fmtPct(comparison.deltas.qtyPct)})
                          </span>
                        </Text>
                        <Text as="p">units</Text>
                        <Text as="p" variant="headingLg">
                          {comparison.deltas.sales > 0 ? "+" : ""}{fmtMoney(comparison.deltas.sales)}
                          {" "}
                          <span style={{ color: comparison.deltas.sales > 0 ? "green" : (comparison.deltas.sales < 0 ? "red" : "inherit") }}>
                            ({fmtPct(comparison.deltas.salesPct)})
                          </span>
                        </Text>
                        <Text as="p">sales</Text>
                      </BlockStack>
                    </InlineStack>

                    {/* Comparison table */}
                    {comparisonTable.length > 0 && (
                      <DataTable
                        columnContentTypes={Array(comparisonHeaders.length).fill("text")}
                        headings={comparisonHeaders}
                        rows={comparisonTable.map((row) => {
                          if (filters?.compareScope === "product") {
                            return [
                              row.product,
                              fmtNum(row.qtyCurr),
                              fmtNum(row.qtyPrev),
                              (row.qtyDelta > 0 ? "+" : "") + fmtNum(row.qtyDelta),
                              fmtPct(row.qtyDeltaPct),
                              fmtMoney(row.salesCurr),
                              fmtMoney(row.salesPrev),
                              (row.salesDelta > 0 ? "+" : "") + fmtMoney(row.salesDelta),
                              fmtPct(row.salesDeltaPct),
                            ];
                          } else {
                            return [
                              row.period,
                              fmtNum(row.qtyCurr),
                              fmtNum(row.qtyPrev),
                              (row.qtyDelta > 0 ? "+" : "") + fmtNum(row.qtyDelta),
                              fmtPct(row.qtyDeltaPct),
                              fmtMoney(row.salesCurr),
                              fmtMoney(row.salesPrev),
                              (row.salesDelta > 0 ? "+" : "") + fmtMoney(row.salesDelta),
                              fmtPct(row.salesDeltaPct),
                            ];
                          }
                        })}
                      />
                    )}
                  </BlockStack>
                )}
              </BlockStack>
            )}
          </>
        )}
      </BlockStack>
    </Page>
  );
}
