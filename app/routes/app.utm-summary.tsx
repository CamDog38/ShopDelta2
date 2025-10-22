import { useEffect, useMemo, useState } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import { Page, Card, Layout, Text, InlineStack, Box, Button, TextField } from "@shopify/polaris";

export const meta: MetaFunction = () => [{ title: "Campaign Analytics" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
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
      const res = await fetch(`/api/utm-summary?${qs}`);
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
                <InlineStack gap="800" align="start" wrap>
                  <Metric label="Orders" value={fmtNum(data.orders)} />
                  <Metric label="Total sales" value={fmtMoney(data.total_sales, data.currency)} />
                  <Metric label="Average order value" value={fmtMoney(data.average_order_value, data.currency)} />
                  <Metric label="Gross sales" value={fmtMoney(data.gross_sales, data.currency)} />
                  <Metric label="Net sales" value={fmtMoney(data.net_sales, data.currency)} />
                  <Metric label="Discounts" value={fmtMoney(data.discounts, data.currency)} />
                  <Metric label="Taxes" value={fmtMoney(data.taxes, data.currency)} />
                  <Metric label="Shipping" value={fmtMoney(data.total_shipping_charges, data.currency)} />
                  <Metric label="Total returns" value={fmtMoney(data.total_returns, data.currency)} />
                  <Metric label="Orders (first-time)" value={fmtNum(data.orders_first_time)} />
                  <Metric label="Orders (returning)" value={fmtNum(data.orders_returning)} />
                  <Metric label="Sales (first-time)" value={fmtMoney(data.total_sales_first_time, data.currency)} />
                  <Metric label="Sales (returning)" value={fmtMoney(data.total_sales_returning, data.currency)} />
                  <Metric label="New customers" value={fmtNum(data.new_customers)} />
                  <Metric label="Returning customers" value={fmtNum(data.returning_customers)} />
                  <Metric label="Amount spent / customer" value={fmtMoney(data.amount_spent_per_customer, data.currency)} />
                  <Metric label="# orders / customer" value={fmtNum(data.number_of_orders_per_customer)} />
                  <Metric label="Returning customer rate" value={fmtPct(data.returning_customer_rate)} />
                  {/* Staff-assisted metric removed */}
                  <Metric label="Top UTM campaign" value={data.order_utm_campaign || "-"} />
                  <Metric label="Top UTM medium" value={data.order_utm_medium || "-"} />
                  <Metric label="Currency" value={data.currency || "-"} />
                </InlineStack>
              </Box>
            </Card>
          </Layout.Section>
        )}

        {data && (
          <Layout.Section>
            <Card>
              <Box padding="400">
                <Text as="h3" variant="headingMd">Raw response</Text>
                <pre style={{ overflow: "auto", marginTop: 12 }}>{JSON.stringify(data, null, 2)}</pre>
              </Box>
            </Card>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Box minWidth="260" padding="200" borderWidth="025" borderRadius="200">
      <Text as="p" variant="bodySm" tone="subdued">{label}</Text>
      <Text as="p" variant="headingMd">{value}</Text>
    </Box>
  );
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
