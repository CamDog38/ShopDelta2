import { useEffect, useMemo, useState } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import { Page, Card, Layout, Text, InlineStack, Box, Button, TextField, DataTable, Scrollable } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

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

  const qs = useMemo(() => `since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}`, [since, until]);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/app/api/utm-summary?${qs}`, { credentials: "same-origin" });
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

  const onApply = () => {
    setSearchParams({ since, until });
    run();
  };

  return (
    <Page title="Campaign Analytics">
      <Layout>
        <Layout.Section>
          <Card>
            <Box padding="400">
              <InlineStack gap="400" align="start">
                <div style={{ width: 220 }}>
                  <TextField label="Since (YYYY-MM-DD)" value={since} onChange={(v) => setSince(v)} autoComplete="off" />
                </div>
                <div style={{ width: 220 }}>
                  <TextField label="Until (YYYY-MM-DD)" value={until} onChange={(v) => setUntil(v)} autoComplete="off" />
                </div>
                <div>
                  <Button variant="primary" loading={loading} onClick={onApply}>Run</Button>
                </div>
              </InlineStack>
            </Box>
          </Card>
        </Layout.Section>

        {error && (
          <Layout.Section>
            <Card>
              <Box padding="400">
                <Text as="p" tone="critical">{error}</Text>
              </Box>
            </Card>
          </Layout.Section>
        )}

        {data && (
          <Layout.Section>
            <Card>
              <Box padding="400">
                <Scrollable shadow style={{ maxHeight: 420 }}>
                  <DataTable
                    columnContentTypes={["text", "text"]}
                    headings={["Metric", "Value"]}
                    rows={buildRows(data)}
                    increasedTableDensity
                    stickyHeader
                  />
                </Scrollable>
              </Box>
            </Card>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}

function buildRows(d: any): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  rows.push(["Orders", fmtNum(d.orders)]);
  rows.push(["Total sales", fmtMoney(d.total_sales, d.currency)]);
  rows.push(["Average order value", fmtMoney(d.average_order_value, d.currency)]);
  rows.push(["Gross sales", fmtMoney(d.gross_sales, d.currency)]);
  rows.push(["Net sales", fmtMoney(d.net_sales, d.currency)]);
  rows.push(["Discounts", fmtMoney(d.discounts, d.currency)]);
  rows.push(["Taxes", fmtMoney(d.taxes, d.currency)]);
  rows.push(["Shipping", fmtMoney(d.total_shipping_charges, d.currency)]);
  rows.push(["Total returns", fmtMoney(d.total_returns, d.currency)]);
  rows.push(["Orders (first-time)", fmtNum(d.orders_first_time)]);
  rows.push(["Orders (returning)", fmtNum(d.orders_returning)]);
  rows.push(["Sales (first-time)", fmtMoney(d.total_sales_first_time, d.currency)]);
  rows.push(["Sales (returning)", fmtMoney(d.total_sales_returning, d.currency)]);
  rows.push(["New customers", fmtNum(d.new_customers)]);
  rows.push(["Returning customers", fmtNum(d.returning_customers)]);
  rows.push(["Amount spent / customer", fmtMoney(d.amount_spent_per_customer, d.currency)]);
  rows.push(["# orders / customer", fmtNum(d.number_of_orders_per_customer)]);
  rows.push(["Returning customer rate", fmtPct(d.returning_customer_rate)]);
  rows.push(["Top UTM campaign", d.order_utm_campaign || "-"]);
  rows.push(["Top UTM medium", d.order_utm_medium || "-"]);
  rows.push(["Currency", d.currency || "-"]);
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
