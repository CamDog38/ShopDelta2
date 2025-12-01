import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";
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

  const [metric, setMetric] = useState<"sales" | "qty">("sales");

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

  const top20Products = (() => {
    const rows = (annualProducts?.table || []).slice();
    if (metric === "sales") {
      rows.sort((a: any, b: any) => (b.salesCurr as number) - (a.salesCurr as number));
    } else {
      rows.sort((a: any, b: any) => (b.qtyCurr as number) - (a.qtyCurr as number));
    }
    return rows.slice(0, 20);
  })();

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

        {/* Story 2 – Top products for this period */}
        <Card>
          <BlockStack gap="300">
            <div>
              <Text as="h2" variant="headingMd">
                Top products for this period
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Your strongest products in the selected period. Sort by either
                sales or quantity to see which products lead the pack.
              </Text>
            </div>
            <div>
              <InlineStack gap="200">
                <div
                  onClick={() => setMetric("sales")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    background:
                      metric === "sales"
                        ? "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
                        : "rgba(0,0,0,0.04)",
                    color: metric === "sales" ? "white" : "#555",
                  }}
                >
                  💰 By sales
                </div>
                <div
                  onClick={() => setMetric("qty")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    background:
                      metric === "qty"
                        ? "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
                        : "rgba(0,0,0,0.04)",
                    color: metric === "qty" ? "white" : "#555",
                  }}
                >
                  📦 By quantity
                </div>
              </InlineStack>
            </div>

            <div style={{ width: "100%", height: 360 }}>
              <ResponsiveContainer>
                <BarChart
                  data={top20Products}
                  layout="vertical"
                  margin={{ left: 0, right: 24, top: 16, bottom: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) =>
                      metric === "sales"
                        ? `ZAR ${fmtMoney(v as number)}`
                        : `${v}`
                    }
                  />
                  <YAxis type="category" dataKey="product" width={260} />
                  <Tooltip
                    formatter={(value: any) =>
                      metric === "sales"
                        ? `ZAR ${fmtMoney(value)}`
                        : `${value} units`
                    }
                  />
                  <Bar
                    dataKey={metric === "sales" ? "salesCurr" : "qtyCurr"}
                    radius={6}
                    fill="#42a5f5"
                  >
                    <LabelList
                      dataKey={metric === "sales" ? "salesCurr" : "qtyCurr"}
                      position="right"
                      formatter={(v: any) =>
                        metric === "sales"
                          ? `ZAR ${fmtMoney(v)}`
                          : `${v}`
                      }
                      style={{ fontSize: 11, fill: "#444" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </BlockStack>
        </Card>

        {/* Story 3 – YoY product rank shifts (slopegraph) */}
        <Card>
          <BlockStack gap="300">
            <div>
              <Text as="h2" variant="headingMd">
                How product rankings shifted year over year
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Follows the top products by sales in the current year and shows
                how their rank changed vs last year.
              </Text>
            </div>
            <div>
              {(() => {
                const rows: any[] = annualProducts?.table || [];
                if (!rows.length) return <Text as="p" variant="bodySm">Not enough data yet.</Text>;

                // Top 10 by current-year sales
                const currSorted = rows.slice().sort((a, b) => (b.salesCurr as number) - (a.salesCurr as number));
                const top = currSorted.slice(0, 10);

                // Build rank maps for prev and curr year
                const prevSorted = rows.slice().sort((a, b) => (b.salesPrev as number) - (a.salesPrev as number));
                const prevRank = new Map<string, number>();
                prevSorted.forEach((r, idx) => prevRank.set(r.product, idx + 1));
                const currRank = new Map<string, number>();
                currSorted.forEach((r, idx) => currRank.set(r.product, idx + 1));

                const height = 420;
                const width = 780;
                const marginTop = 40;
                const marginBottom = 40;
                const maxRank = Math.max(
                  ...top.map((r) => prevRank.get(r.product) || top.length),
                  ...top.map((r) => currRank.get(r.product) || top.length)
                );
                const band = (height - marginTop - marginBottom) / (maxRank + 1);
                const xLeft = 120;
                const xRight = width - 120;

                const yForRank = (rank: number) => marginTop + band * rank;

                return (
                  <svg width="100%" viewBox={`0 0 ${width} ${height}`}
                    style={{ maxWidth: '100%', height: 'auto' }}>
                    {/* Year labels */}
                    <text x={xLeft} y={24} textAnchor="middle" fontSize={12} fill="#666">
                      {yearA}
                    </text>
                    <text x={xRight} y={24} textAnchor="middle" fontSize={12} fill="#666">
                      {yearB}
                    </text>

                    {/* Vertical guide lines */}
                    <line x1={xLeft} y1={marginTop} x2={xLeft} y2={height - marginBottom} stroke="#e0e0e0" />
                    <line x1={xRight} y1={marginTop} x2={xRight} y2={height - marginBottom} stroke="#e0e0e0" />

                    {top.map((r) => {
                      const p = r.product as string;
                      const pr = prevRank.get(p) || maxRank;
                      const cr = currRank.get(p) || maxRank;
                      const y1 = yForRank(pr);
                      const y2 = yForRank(cr);
                      const improved = cr < pr;
                      const color = improved ? '#4caf50' : '#ef5350';

                      return (
                        <g key={p}>
                          {/* connecting line */}
                          <line x1={xLeft} y1={y1} x2={xRight} y2={y2} stroke={color} strokeWidth={2} />
                          {/* left dot + label */}
                          <circle cx={xLeft} cy={y1} r={4} fill={color} />
                          <text x={xLeft - 8} y={y1 + 4} textAnchor="end" fontSize={10} fill="#555">
                            #{pr}
                          </text>
                          {/* right dot + label */}
                          <circle cx={xRight} cy={y2} r={4} fill={color} />
                          <text x={xRight + 8} y={y2 + 4} textAnchor="start" fontSize={10} fill="#555">
                            #{cr}
                          </text>
                        </g>
                      );
                    })}

                    {/* Product names on the right */}
                    {top.map((r) => {
                      const p = r.product as string;
                      const cr = currRank.get(p) || maxRank;
                      const y2 = yForRank(cr);
                      return (
                        <text
                          key={`label-${p}`}
                          x={xRight + 40}
                          y={y2 + 4}
                          fontSize={11}
                          fill="#333"
                        >
                          {p}
                        </text>
                      );
                    })}
                  </svg>
                );
              })()}
            </div>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
