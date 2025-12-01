import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, BlockStack, Text, InlineStack, Card } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import type { YoYResult } from "../analytics.yoy.server";
import {
  computeYoYAnnualAggregate,
  computeYoYAnnualProduct,
} from "../analytics.yoy.server";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  ReferenceLine,
  LabelList,
} from "recharts";

// Loader: reuse existing analytics helpers but focus on story data
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const yearBParam = url.searchParams.get("yearB");
  const yearAParam = url.searchParams.get("yearA");
  const ytdParam = url.searchParams.get("ytd");

  // Default to current year vs previous year, YTD on
  const now = new Date();
  const defaultYearB = now.getUTCFullYear();
  const defaultYearA = defaultYearB - 1;
  const yearB = yearBParam ? parseInt(yearBParam, 10) : defaultYearB;
  const yearA = yearAParam ? parseInt(yearAParam, 10) : defaultYearA;
  const ytd = !!(ytdParam && (/^(1|true)$/i).test(ytdParam));

  // Authenticate and get Shopify admin client
  const { admin } = await authenticate.admin(request);

  const annualYoY: YoYResult = await computeYoYAnnualAggregate({
    admin,
    yearA,
    yearB,
    ytd,
  });

  const annualProducts: YoYResult = await computeYoYAnnualProduct({
    admin,
    yearA,
    yearB,
    ytd,
  }) as any;

  // Basic monthly series for momentum chart comes from annualYoY.table
  const seriesMonth = annualYoY.table.map((row) => ({
    period: row.period,
    salesCurr: row.salesCurr,
    salesPrev: row.salesPrev,
    salesDelta: row.salesDelta,
  }));

  return json({ yearA, yearB, ytd, annualYoY, annualProducts, seriesMonth });
}

export default function VisualisationsPage() {
  const data = useLoaderData<typeof loader>();
  const { yearA, yearB, ytd, annualYoY, annualProducts, seriesMonth } = data as any;

  const heroTitle = ytd
    ? `Year-to-date ${yearB} vs ${yearA}`
    : `${yearB} vs ${yearA}`;

  const totalSalesCurr = annualYoY?.comparison?.current?.sales ?? 0;
  const totalSalesPrev = annualYoY?.comparison?.previous?.sales ?? 0;
  const totalSalesDelta = totalSalesCurr - totalSalesPrev;
  const totalSalesDeltaPct = annualYoY?.comparison?.deltas?.salesPct ?? null;

  const fmtMoney = (n: number | null | undefined) => {
    const v = Number(n ?? 0);
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v);
  };

  const fmtPct = (n: number | null | undefined) =>
    n == null ? "–" : `${n.toFixed(1)}%`;

  const topDrivers = (annualProducts?.table || [])
    .slice()
    .sort((a: any, b: any) => (b.salesDelta as number) - (a.salesDelta as number))
    .slice(0, 5);

  const topDraggers = (annualProducts?.table || [])
    .slice()
    .sort((a: any, b: any) => (a.salesDelta as number) - (b.salesDelta as number))
    .slice(0, 5);

  return (
    <Page>
      <TitleBar title="Visualisations" />
      <BlockStack gap="400">
        {/* Hero section */}
        <div
          style={{
            background:
              "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "24px",
            borderRadius: "16px",
            color: "white",
            boxShadow: "0 18px 45px rgba(102, 126, 234, 0.35)",
          }}
        >
          <Text as="h1" variant="headingLg">
            How your store is performing
          </Text>
          <Text as="p" variant="bodySm">
            A story-driven view of your year-over-year and month-over-month
            performance.
          </Text>
          <div style={{ marginTop: 20 }}>
            <Text as="p" variant="bodySm">
              {heroTitle}
            </Text>
          </div>
          <div style={{ marginTop: 20 }}>
            <InlineStack gap="400" wrap>
              <div
                style={{
                  background: "rgba(255,255,255,0.12)",
                  padding: 16,
                  borderRadius: 12,
                  minWidth: 220,
                }}
              >
                <Text as="p" variant="bodySm" tone="subdued">
                  Total sales ({yearB})
                </Text>
                <Text as="p" variant="headingLg">
                  ZAR {fmtMoney(totalSalesCurr)}
                </Text>
                <Text as="p" variant="bodySm">
                  vs ZAR {fmtMoney(totalSalesPrev)} last year
                </Text>
                <div
                  style={{
                    marginTop: 8,
                    padding: "4px 10px",
                    borderRadius: 999,
                    display: "inline-block",
                    background:
                      (totalSalesDelta ?? 0) >= 0
                        ? "rgba(46,213,115,0.35)"
                        : "rgba(231,76,60,0.35)",
                  }}
                >
                  <Text as="span" variant="bodySm">
                    {(totalSalesDelta ?? 0) >= 0 ? "↑" : "↓"} ZAR {fmtMoney(
                      Math.abs(totalSalesDelta)
                    )} ({fmtPct(totalSalesDeltaPct)})
                  </Text>
                </div>
              </div>
            </InlineStack>
          </div>
        </div>

        {/* Story 1 – Annual YoY by month */}
        <Card>
          <BlockStack gap="300">
            <div>
              <Text as="h2" variant="headingMd">
                Year vs year by month
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                See which months drove your year-over-year change. Bars to the
                right beat last year; bars to the left fell behind.
              </Text>
            </div>
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={annualYoY?.table || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `ZAR ${fmtMoney(v as number)}`}
                  />
                  <YAxis type="category" dataKey="period" width={140} />
                  <Tooltip
                    formatter={(value: any) => `ZAR ${fmtMoney(value)}`}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <ReferenceLine x={0} stroke="#999" />
                  <Bar
                    dataKey="salesDelta"
                    radius={6}
                    fill="#4caf50"
                    isAnimationActive
                  >
                    <LabelList
                      dataKey="salesDelta"
                      position="right"
                      formatter={(v: any) => `ZAR ${fmtMoney(v)}`}
                      style={{ fontSize: 11, fill: "#444" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </BlockStack>
        </Card>

        {/* Story 2 – Product drivers and draggers */}
        <Card>
          <BlockStack gap="300">
            <div>
              <Text as="h2" variant="headingMd">
                Product drivers & draggers
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                The products that pushed you forward and those that held you
                back, ranked by year-over-year change in sales.
              </Text>
            </div>
            <InlineStack gap="400" wrap>
              <div style={{ flex: 2, minWidth: 280, height: 320 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={[...topDrivers, ...topDraggers]}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => `ZAR ${fmtMoney(v as number)}`}
                    />
                    <YAxis
                      type="category"
                      dataKey="product"
                      width={200}
                    />
                    <Tooltip
                      formatter={(value: any) => `ZAR ${fmtMoney(value)}`}
                    />
                    <ReferenceLine x={0} stroke="#999" />
                    <Bar
                      dataKey="salesDelta"
                      radius={6}
                      fill="#42a5f5"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, minWidth: 240 }}>
                <BlockStack gap="300">
                  <div>
                    <Text as="h3" variant="headingSm">
                      Top drivers
                    </Text>
                    {topDrivers.map((p: any) => (
                      <div key={p.product} style={{ marginTop: 8 }}>
                        <Text as="p" variant="bodySm">
                          {p.product}
                        </Text>
                        <Text as="p" variant="bodyXs" tone="subdued">
                          +ZAR {fmtMoney(p.salesDelta)} ({fmtPct(p.salesDeltaPct)})
                        </Text>
                      </div>
                    ))}
                  </div>
                  <div>
                    <Text as="h3" variant="headingSm">
                      Top draggers
                    </Text>
                    {topDraggers.map((p: any) => (
                      <div key={p.product} style={{ marginTop: 8 }}>
                        <Text as="p" variant="bodySm">
                          {p.product}
                        </Text>
                        <Text as="p" variant="bodyXs" tone="subdued">
                          ZAR {fmtMoney(p.salesDelta)} ({fmtPct(p.salesDeltaPct)})
                        </Text>
                      </div>
                    ))}
                  </div>
                </BlockStack>
              </div>
            </InlineStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
