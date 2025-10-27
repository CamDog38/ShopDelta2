import { useEffect, useMemo, useState } from "react";
import type { LoaderFunctionArgs, MetaFunction, LinksFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import { Page, Card, Layout, Text, InlineStack, Box, Button, DataTable, Scrollable, BlockStack } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import analyticsStylesUrl from "../styles/analytics.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: analyticsStylesUrl },
];

export const meta: MetaFunction = () => [{ title: "Campaign Analytics" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Ensure app is authenticated (will redirect to /auth if needed)
  await authenticate.admin(request);
  const url = new URL(request.url);
  const since = url.searchParams.get("since");
  const until = url.searchParams.get("until");

  // Defaults: last 30 days in UTC
  const now = new Date();
  const end = until || new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    .toISOString()
    .slice(0, 10);
  const startDate = new Date(end + "T00:00:00Z");
  startDate.setUTCDate(startDate.getUTCDate() - 29);
  const start = since || startDate.toISOString().slice(0, 10);

  return json({ start, end });
};

export default function UtmSummaryPage() {
  const { start, end } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [since, setSince] = useState<string>(searchParams.get("since") || start);
  const [until, setUntil] = useState<string>(searchParams.get("until") || end);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);
  
  // Products section state
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [selectedMedium, setSelectedMedium] = useState<string>("");
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [productsData, setProductsData] = useState<any | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showUTMHelp, setShowUTMHelp] = useState(false);
  // Ad spend state for ROAS (keyed by "campaign|medium")
  const [spendMap, setSpendMap] = useState<Record<string, number>>({});
  const spendObj = useMemo(() => {
    const entries = Object.entries(spendMap).filter(([_, v]) => typeof v === 'number' && !isNaN(v) && v > 0);
    return Object.fromEntries(entries);
  }, [spendMap]);
  const spendQS = useMemo(() => {
    const keys = Object.keys(spendObj);
    if (!keys.length) return '';
    try { return `&spend=${encodeURIComponent(JSON.stringify(spendObj))}`; } catch { return ''; }
  }, [spendObj]);

  const qs = useMemo(() => `since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}`, [since, until]);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/app/api/utm-summary?${qs}${spendQS}`, { credentials: "same-origin" });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const text = await res.text();
        // Common case: auth redirect HTML when scopes/session missing
        throw new Error(
          "Unexpected non-JSON response from server. This often happens when the app requires re-authentication or updated scopes. Please re-open the app (which will re-auth) and try again."
        );
      }
      const j = await res.json();
      if (!res.ok && j?.error) throw new Error(j.error);
      setData(j);
    } catch (e: any) {
      setError(e?.message || "Failed to fetch summary");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize spendMap from server data when available
  useEffect(() => {
    if (!data?.utmRows) return;
    const next: Record<string, number> = {};
    for (const utm of data.utmRows) {
      const key = `${utm.campaign}|${utm.medium}`;
      const v = Number(utm.ad_spend || 0);
      if (v > 0) next[key] = v;
    }
    setSpendMap((prev) => ({ ...next, ...prev }));
  }, [data]);

  const commitSpend = (key: string, raw: string) => {
    const n = Number(raw);
    setSpendMap((prev) => {
      const copy = { ...prev };
      if (!isFinite(n) || n <= 0) {
        delete copy[key];
      } else {
        copy[key] = Number(n.toFixed(2));
      }
      return copy;
    });
    // Re-run fetch with spend to compute server-side ROAS; UI also computes immediately
    setTimeout(() => run(), 0);
  };

  // Export UTM breakdown to Excel (includes ROAS if ad spend provided)
  const exportUtmWorkbook = () => {
    setIsExporting(true);
    const params = new URLSearchParams();
    params.set("since", since);
    params.set("until", until);
    if (Object.keys(spendObj).length) params.set("spend", JSON.stringify(spendObj));
    const href = `/app/utm-summary/export?${params.toString()}`;
    fetch(href, { method: "GET", credentials: "include" })
      .then((response) => {
        if (!response.ok) throw new Error(`Export failed: ${response.statusText}`);
        return response.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `utm-summary-${since}-to-${until}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => alert(err.message || "Export failed"))
      .finally(() => setIsExporting(false));
  };

  const onApply = () => {
    setSearchParams({ since, until });
    run();
  };

  const fetchProducts = async (campaign: string, medium: string) => {
    if (!campaign || !medium) {
      setProductsError("Please select a campaign and medium");
      return;
    }
    setProductsLoading(true);
    setProductsError(null);
    try {
      const qs = `campaign=${encodeURIComponent(campaign)}&medium=${encodeURIComponent(medium)}&since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}`;
      const res = await fetch(`/app/api/utm-products?${qs}`, { credentials: "same-origin" });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        throw new Error("Unexpected non-JSON response from server");
      }
      const j = await res.json();
      if (!res.ok && j?.error) throw new Error(j.error);
      setProductsData(j);
    } catch (e: any) {
      setProductsError(e?.message || "Failed to fetch products");
    } finally {
      setProductsLoading(false);
    }
  };

  return (
    <Page title="Campaign Analytics">
      <BlockStack gap="400">
        {/* Filters Card - NOT sticky */}
        <div style={{ background: 'var(--p-color-bg-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--p-color-border)' }}>
          <Text as="h3" variant="headingSm" tone="subdued">Date Range & Filters</Text>
          <div style={{ marginTop: '16px' }}>
            <InlineStack gap="300" wrap align="end">
              <div style={{ minWidth: '140px' }}>
                <Text as="span" variant="bodySm" tone="subdued">Time Period</Text>
                <select 
                  defaultValue={"last30"}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', border: '1px solid var(--p-color-border)', borderRadius: '6px' }}
                  onChange={(e) => {
                    const preset = e.target.value;
                    const now = new Date();
                    const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
                    let start: Date, end: Date;
                    switch (preset) {
                      case 'last7':
                        end = utcNow; start = new Date(utcNow); start.setUTCDate(start.getUTCDate() - 6); break;
                      case 'last30':
                        end = utcNow; start = new Date(utcNow); start.setUTCDate(start.getUTCDate() - 29); break;
                      case 'thisMonth':
                        start = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), 1)); end = utcNow; break;
                      case 'lastMonth': {
                        const firstThis = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), 1));
                        start = new Date(Date.UTC(firstThis.getUTCFullYear(), firstThis.getUTCMonth() - 1, 1));
                        end = new Date(Date.UTC(firstThis.getUTCFullYear(), firstThis.getUTCMonth(), 0));
                        break;
                      }
                      case 'ytd':
                        start = new Date(Date.UTC(utcNow.getUTCFullYear(), 0, 1)); end = utcNow; break;
                      default:
                        return; // custom
                    }
                    setSince(start.toISOString().slice(0, 10));
                    setUntil(end.toISOString().slice(0, 10));
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
                <input type="date" value={since} onChange={(e) => setSince(e.target.value)} style={{ width: '100%', marginTop: '4px', padding: '8px', border: '1px solid var(--p-color-border)', borderRadius: '6px' }} />
              </div>
              <div style={{ minWidth: '120px' }}>
                <Text as="span" variant="bodySm" tone="subdued">End Date</Text>
                <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} style={{ width: '100%', marginTop: '4px', padding: '8px', border: '1px solid var(--p-color-border)', borderRadius: '6px' }} />
              </div>
              <Button variant="primary" loading={loading} onClick={onApply}>Apply Filters</Button>
            </InlineStack>
          </div>
        </div>

        {error && (
          <Card>
            <Box padding="400">
              <Text as="p" tone="critical">{error}</Text>
            </Box>
          </Card>
        )}

        {/* UTM Breakdown Table with editable Ad Spend */}
        {data && (
          <div style={{ background: 'var(--p-color-bg-surface)', padding: '24px', borderRadius: '12px', border: '1px solid var(--p-color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
                <Text as="h3" variant="headingSm">UTM Campaign Breakdown</Text>
                <span
                  onMouseEnter={() => setShowUTMHelp(true)}
                  onMouseLeave={() => setShowUTMHelp(false)}
                  style={{
                    background: '#ff9800', color: '#ffffff', padding: '2px 8px', borderRadius: '999px', fontSize: 12, cursor: 'help', border: '1px solid rgba(0,0,0,0.1)'
                  }}
                  aria-describedby="utm-breakdown-help"
                >ℹ Read me</span>
                <div
                  id="utm-breakdown-help"
                  role="tooltip"
                  style={{ position: 'absolute', top: '130%', left: 0, zIndex: 10, width: 420, background: 'white', color: 'var(--p-color-text)', border: '1px solid var(--p-color-border)', borderRadius: 8, padding: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', display: showUTMHelp ? 'block' : 'none' }}
                >
                  <div style={{ marginBottom: 8 }}>
                    <Text as="p" variant="bodySm"><b>UTM Campaign Breakdown</b></Text>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <Text as="p" variant="bodyXs" tone="subdued">
                      This table summarizes sales and orders by UTM Campaign and Medium for the selected date range.
                      To calculate ROAS, enter <b>Ad Spend</b> per row. ROAS is computed as <b>Total Sales / Ad Spend</b>.
                      Press <b>Enter</b> or click away to apply. The Excel export will include Ad Spend and ROAS.
                    </Text>
                  </div>
                </div>
              </div>
              <div
                onClick={isExporting ? undefined : exportUtmWorkbook}
                title="Export UTM table to Excel"
                style={{
                  padding: '10px 16px', borderRadius: 8,
                  background: isExporting ? 'linear-gradient(135deg, #c7c7c7 0%, #e0e0e0 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white', cursor: isExporting ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14,
                  boxShadow: isExporting ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.3)'
                }}
              >
                {isExporting ? '⏳ Exporting...' : '📥 Export Excel'}
              </div>
            </div>
            <Box paddingBlockStart="400">
              <div className="analytics-table-sticky" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--p-color-border)' }}>
                      <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600, minWidth: 160 }}>Campaign</th>
                      <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600, minWidth: 120 }}>Medium</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600, minWidth: 120 }}>Total Sales</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600, minWidth: 90 }}>Orders</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600, minWidth: 120 }}>AOV</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600, minWidth: 120 }}>Net Sales</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600, minWidth: 120 }}>Gross Sales</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600, minWidth: 110 }}>Discounts</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600, minWidth: 110 }}>Returns</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600, minWidth: 100 }}>Taxes</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600, minWidth: 120 }}>Shipping</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600, minWidth: 120 }}>Total Returns</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600, minWidth: 140 }}>Sales (First-Time)</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600, minWidth: 140 }}>Sales (Returning)</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600, minWidth: 140 }}>Orders (First-Time)</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600, minWidth: 140 }}>Orders (Returning)</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600, minWidth: 120 }}>New Customers</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600, minWidth: 160 }}>Returning Customers</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600, minWidth: 140 }}>Spent / Customer</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600, minWidth: 140 }}>Orders / Customer</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600, minWidth: 130 }}>Returning Rate</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600, minWidth: 150 }}>
                        Ad Spend
                        <span title="Enter ad spend per campaign|medium. Press Enter or tab out to recalc ROAS." style={{ marginLeft: 6, cursor: 'help', color: 'var(--p-color-text-subdued)' }}>ⓘ</span>
                      </th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600, minWidth: 100 }}>ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Summary row */}
                    {(() => {
                      const s = data.summary;
                      const aov = s.orders ? s.total_sales / s.orders : 0;
                      const amtPerCust = s.customers ? s.total_sales / s.customers : 0;
                      const ordersPerCust = s.customers ? s.orders / s.customers : 0;
                      const roasSummary = (() => {
                        const ad = Object.values(spendObj).reduce((acc: number, v: any) => acc + (Number(v) || 0), 0);
                        if (ad > 0) {
                          const r = s.total_sales / ad; return `${(Math.round((r + Number.EPSILON) * 100) / 100).toFixed(2)}x`;
                        }
                        return data.summary.roas != null ? `${(Math.round((Number(data.summary.roas) + Number.EPSILON) * 100) / 100).toFixed(2)}x` : '-';
                      })();
                      return (
                        <tr style={{ borderBottom: '1px solid var(--p-color-border)' }}>
                          <td style={{ padding: '12px' }}>Summary</td>
                          <td style={{ padding: '12px' }}></td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtMoney(s.total_sales, data.currency)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtNum(s.orders)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtMoney(aov, data.currency)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtMoney(s.net_sales, data.currency)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtMoney(s.gross_sales, data.currency)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtMoney(s.discounts, data.currency)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtMoney(0, data.currency)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtMoney(s.taxes, data.currency)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtMoney(s.total_shipping_charges, data.currency)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtMoney(s.total_returns, data.currency)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtMoney(s.total_sales_first_time, data.currency)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtMoney(s.total_sales_returning, data.currency)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtNum(s.orders_first_time)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtNum(s.orders_returning)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtNum(s.new_customers)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtNum(s.returning_customers)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtMoney(amtPerCust, data.currency)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtNum(ordersPerCust)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtPct(s.returning_customer_rate)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}></td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{roasSummary}</td>
                        </tr>
                      );
                    })()}
                    {/* Data rows */}
                    {data.utmRows?.map((utm: any, idx: number) => {
                      const key = `${utm.campaign}|${utm.medium}`;
                      const adSpend = spendMap[key] ?? Number(utm.ad_spend || 0);
                      const aov = utm.orders ? utm.total_sales / utm.orders : 0;
                      const amtPerCust = utm.customers ? utm.total_sales / utm.customers : 0;
                      const ordersPerCust = utm.customers ? utm.orders / utm.customers : 0;
                      const returningRate = (utm.orders_first_time + utm.orders_returning) ? (utm.orders_returning / (utm.orders_first_time + utm.orders_returning)) * 100 : 0;
                      const roas = adSpend > 0 ? `${(Math.round(((utm.total_sales / adSpend) + Number.EPSILON) * 100) / 100).toFixed(2)}x` : (utm.roas != null ? `${(Math.round((Number(utm.roas) + Number.EPSILON) * 100) / 100).toFixed(2)}x` : '-') ;
                      return (
                        <tr key={`${utm.campaign}|${utm.medium}|${idx}`} style={{ borderBottom: '1px solid var(--p-color-border)' }}>
                          <td style={{ padding: '12px' }}>{utm.campaign}</td>
                          <td style={{ padding: '12px' }}>{utm.medium}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtMoney(utm.total_sales, data.currency)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtNum(utm.orders)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtMoney(aov, data.currency)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtMoney(utm.net_sales, data.currency)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtMoney(utm.gross_sales, data.currency)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtMoney(utm.discounts, data.currency)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtMoney(0, data.currency)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtMoney(utm.taxes, data.currency)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtMoney(utm.shipping, data.currency)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtMoney(utm.returns, data.currency)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtMoney(utm.total_sales_first_time, data.currency)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtMoney(utm.total_sales_returning, data.currency)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtNum(utm.orders_first_time)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtNum(utm.orders_returning)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtNum(utm.orders_first_time)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtNum(Math.max(0, utm.customers - utm.orders_first_time))}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtMoney(amtPerCust, data.currency)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtNum(ordersPerCust)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{fmtPct(returningRate)}</td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>
                            <input
                              type="number"
                              defaultValue={adSpend ? String(adSpend) : ''}
                              inputMode="decimal"
                              step="0.01"
                              placeholder="0.00"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = (e.target as HTMLInputElement).value;
                                  commitSpend(key, val);
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              onBlur={(e) => commitSpend(key, e.currentTarget.value)}
                              style={{ width: 120, textAlign: 'right', padding: '6px 8px', border: '1px solid var(--p-color-border)', borderRadius: 6 }}
                              title="Enter ad spend for this campaign & medium. Press Enter or click away to apply."
                            />
                          </td>
                          <td style={{ textAlign: 'right', padding: '12px' }}>{roas}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Box>
          </div>
        )}

        {/* Summary Tiles - Linked to selected UTM */}
        {data && selectedCampaign && selectedMedium && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {(() => {
              const utm = data.utmRows?.find((row: any) => row.campaign === selectedCampaign && row.medium === selectedMedium);
              if (!utm) return null;
              return (
                <>
                  <SummaryTile label="Total Sales" value={fmtMoney(utm.total_sales, data.currency)} />
                  <SummaryTile label="Orders" value={fmtNum(utm.orders)} />
                  <SummaryTile label="Customers" value={fmtNum(utm.customers)} />
                  <SummaryTile label="Avg Order Value" value={fmtMoney(utm.orders ? utm.total_sales / utm.orders : 0, data.currency)} />
                  <SummaryTile label="New Customers" value={fmtNum(utm.orders_first_time)} />
                  <SummaryTile label="Returning Rate" value={fmtPct((utm.orders_first_time + utm.orders_returning) ? (utm.orders_returning / (utm.orders_first_time + utm.orders_returning)) * 100 : 0)} />
                </>
              );
            })()}
          </div>
        )}

        {/* Products by UTM Section */}
        <div style={{ background: 'var(--p-color-bg-surface)', padding: '24px', borderRadius: '12px', border: '1px solid var(--p-color-border)' }}>
          <Text as="h3" variant="headingSm">Products by UTM</Text>
          <div style={{ marginTop: '16px' }}>
            <InlineStack gap="300" wrap align="end">
              <div style={{ minWidth: '200px' }}>
                <Text as="span" variant="bodySm" tone="subdued">Select Campaign</Text>
                <select 
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', border: '1px solid var(--p-color-border)', borderRadius: '6px' }}
                >
                  <option value="">-- Choose a campaign --</option>
                  {data?.utmRows?.map((row: any) => (
                    <option key={`${row.campaign}|${row.medium}`} value={row.campaign}>
                      {row.campaign}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ minWidth: '200px' }}>
                <Text as="span" variant="bodySm" tone="subdued">Select Medium</Text>
                <select 
                  value={selectedMedium}
                  onChange={(e) => setSelectedMedium(e.target.value)}
                  style={{ width: '100%', marginTop: '4px', padding: '8px', border: '1px solid var(--p-color-border)', borderRadius: '6px' }}
                >
                  <option value="">-- Choose a medium --</option>
                  {data?.utmRows
                    ?.filter((row: any) => !selectedCampaign || row.campaign === selectedCampaign)
                    ?.map((row: any) => (
                      <option key={`${row.campaign}|${row.medium}`} value={row.medium}>
                        {row.medium}
                      </option>
                    ))}
                </select>
              </div>
              <Button 
                variant="primary" 
                loading={productsLoading}
                onClick={() => fetchProducts(selectedCampaign, selectedMedium)}
              >
                Fetch Products
              </Button>
            </InlineStack>
          </div>

          {productsError && (
            <Box paddingBlockStart="400">
              <Text as="p" tone="critical">{productsError}</Text>
            </Box>
          )}

          {productsData && (
            <Box paddingBlockStart="400">
              <div className="analytics-table-sticky" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--p-color-border)' }}>
                      <th style={{ textAlign: 'left', padding: '12px', fontWeight: '600', minWidth: '280px', whiteSpace: 'normal' }}>Product Title</th>
                      <th style={{ textAlign: 'left', padding: '12px', fontWeight: '600', minWidth: '150px' }}>Variant Title</th>
                      <th style={{ textAlign: 'left', padding: '12px', fontWeight: '600', minWidth: '100px' }}>SKU</th>
                      <th style={{ textAlign: 'left', padding: '12px', fontWeight: '600', minWidth: '150px' }}>Handle</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: '600', minWidth: '80px' }}>Orders</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: '600', minWidth: '100px' }}>Qty Sold</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: '600', minWidth: '100px' }}>Unit Price</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: '600', minWidth: '120px' }}>Total Revenue</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: '600', minWidth: '130px' }}>Avg Rev/Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buildProductRows(productsData).map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--p-color-border)' }}>
                        <td style={{ padding: '12px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{row[0]}</td>
                        <td style={{ padding: '12px' }}>{row[1]}</td>
                        <td style={{ padding: '12px' }}>{row[2]}</td>
                        <td style={{ padding: '12px' }}>{row[3]}</td>
                        <td style={{ textAlign: 'right', padding: '12px' }}>{row[4]}</td>
                        <td style={{ textAlign: 'right', padding: '12px' }}>{row[5]}</td>
                        <td style={{ textAlign: 'right', padding: '12px' }}>{row[6]}</td>
                        <td style={{ textAlign: 'right', padding: '12px' }}>{row[7]}</td>
                        <td style={{ textAlign: 'right', padding: '12px' }}>{row[8]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Box>
          )}
        </div>
      </BlockStack>
    </Page>
  );
}

function buildUTMRows(d: any): Array<Array<string | number>> {
  const rows: Array<Array<string | number>> = [];
  const curr = d.currency || "USD";
  const fmtRoas = (n: number | null | undefined) => {
    if (n == null || isNaN(Number(n))) return "-";
    return `${(Math.round((Number(n) + Number.EPSILON) * 10000) / 10000).toFixed(2)}x`;
  };
  
  // Summary row first
  const s = d.summary;
  const summaryAOV = s.orders ? s.total_sales / s.orders : 0;
  const summaryAmtPerCust = s.customers ? s.total_sales / s.customers : 0;
  const summaryOrdersPerCust = s.customers ? s.orders / s.customers : 0;
  
  rows.push([
    "Summary",
    "",
    fmtMoney(s.total_sales, curr),
    fmtNum(s.orders),
    fmtMoney(summaryAOV, curr),
    fmtMoney(s.net_sales, curr),
    fmtMoney(s.gross_sales, curr),
    fmtMoney(s.discounts, curr),
    fmtMoney(0, curr), // returns (kept as 0 per original spec)
    fmtMoney(s.taxes, curr),
    fmtMoney(s.total_shipping_charges, curr),
    fmtMoney(s.total_returns, curr),
    fmtMoney(s.total_sales_first_time, curr),
    fmtMoney(s.total_sales_returning, curr),
    fmtNum(s.orders_first_time),
    fmtNum(s.orders_returning),
    fmtNum(s.new_customers),
    fmtNum(s.returning_customers),
    fmtMoney(summaryAmtPerCust, curr),
    fmtNum(summaryOrdersPerCust),
    fmtPct(s.returning_customer_rate),
    fmtRoas(s.roas),
  ]);

  // Each UTM combination
  for (const utm of d.utmRows || []) {
    const aov = utm.orders ? utm.total_sales / utm.orders : 0;
    const amtPerCust = utm.customers ? utm.total_sales / utm.customers : 0;
    const ordersPerCust = utm.customers ? utm.orders / utm.customers : 0;
    const returningRate = (utm.orders_first_time + utm.orders_returning) 
      ? (utm.orders_returning / (utm.orders_first_time + utm.orders_returning)) * 100 
      : 0;
    const newCustomers = utm.orders_first_time;
    const returningCustomers = Math.max(0, utm.customers - newCustomers);
    
    rows.push([
      utm.campaign,
      utm.medium,
      fmtMoney(utm.total_sales, curr),
      fmtNum(utm.orders),
      fmtMoney(aov, curr),
      fmtMoney(utm.net_sales, curr),
      fmtMoney(utm.gross_sales, curr),
      fmtMoney(utm.discounts, curr),
      fmtMoney(0, curr), // returns (kept as 0 per original spec)
      fmtMoney(utm.taxes, curr),
      fmtMoney(utm.shipping, curr),
      fmtMoney(utm.returns, curr),
      fmtMoney(utm.total_sales_first_time, curr),
      fmtMoney(utm.total_sales_returning, curr),
      fmtNum(utm.orders_first_time),
      fmtNum(utm.orders_returning),
      fmtNum(newCustomers),
      fmtNum(returningCustomers),
      fmtMoney(amtPerCust, curr),
      fmtNum(ordersPerCust),
      fmtPct(returningRate),
      fmtRoas(utm.roas),
    ]);
  }
  
  return rows;
}

function fmtNum(n: number | null | undefined) {
  if (n == null) return "-";
  return new Intl.NumberFormat().format(n);
}
function fmtMoney(n: number | null | undefined, currency?: string | null) {
  if (n == null) return "-";
  const code = currency || "USD";
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: code }).format(n); } catch {
    return `${n.toFixed(2)} ${code}`;
  }
}
function fmtPct(n: number | null | undefined) {
  if (n == null) return "-";
  return `${(Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2)}%`;
}

function buildProductRows(d: any): Array<Array<string | number>> {
  const rows: Array<Array<string | number>> = [];
  const curr = d.currency || "USD";

  for (const product of d.productRows || []) {
    const avgRevenuePerOrder = product.orderCount ? product.totalRevenue / product.orderCount : 0;
    
    rows.push([
      product.productTitle,
      product.variantTitle,
      product.sku,
      product.productHandle,
      fmtNum(product.orderCount),
      fmtNum(product.quantity),
      fmtMoney(product.unitPrice, curr),
      fmtMoney(product.totalRevenue, curr),
      fmtMoney(avgRevenuePerOrder, curr),
    ]);
  }

  return rows;
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 4px 20px rgba(102, 126, 234, 0.15)',
      color: 'white',
      textAlign: 'center'
    }}>
      <div style={{ opacity: 0.9, marginBottom: '8px', fontSize: '12px' }}>{label}</div>
      <div style={{ fontWeight: 'bold', fontSize: '20px' }}>{value}</div>
    </div>
  );
}
