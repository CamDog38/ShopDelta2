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

  // Fetch basic shop metadata for currency and name
  const SHOP_QUERY = `#graphql
    query ShopInfoForVisualisations {
      shop {
        name
        currencyCode
      }
    }
  `;

  let shopName: string | null = null;
  let currencyCode: string | null = null;
  try {
    const res: Response = await admin.graphql(SHOP_QUERY);
    const data = await res.json();
    shopName = (data as any)?.data?.shop?.name ?? null;
    currencyCode = (data as any)?.data?.shop?.currencyCode ?? null;
  } catch {
    shopName = null;
    currencyCode = null;
  }

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

  return json({ yearA, yearB, ytd, annualYoY, annualProducts, seriesMonth, shopName, currencyCode });
}

export default function VisualisationsPage() {
  const data = useLoaderData<typeof loader>();
  const { yearA, yearB, ytd, annualYoY, annualProducts, seriesMonth, shopName, currencyCode } = data as any;

  const [metric, setMetric] = useState<"sales" | "qty">("sales");

  const today = new Date();
  const fmtYMD = (d: Date) => d.toISOString().slice(0, 10);
  const [preset, setPreset] = useState<"thisMonth" | "lastMonth" | "custom">(
    "thisMonth",
  );
  const [since, setSince] = useState<string>(() => {
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    return fmtYMD(start);
  });
  const [until, setUntil] = useState<string>(() => fmtYMD(today));

  const heroTitle = `Year-over-year ${yearB} vs ${yearA}`;

  const totalSalesCurr = annualYoY?.comparison?.current?.sales ?? 0;
  const totalSalesPrev = annualYoY?.comparison?.previous?.sales ?? 0;
  const totalSalesDelta = totalSalesCurr - totalSalesPrev;
  const totalSalesDeltaPct = annualYoY?.comparison?.deltas?.salesPct ?? null;

  const totalQtyCurr = annualYoY?.comparison?.current?.qty ?? 0;
  const totalQtyPrev = annualYoY?.comparison?.previous?.qty ?? 0;
  const totalQtyDelta = totalQtyCurr - totalQtyPrev;
  const totalQtyDeltaPct = annualYoY?.comparison?.deltas?.qtyPct ?? null;

  const fmtMoney = (n: number | null | undefined) => {
    const v = Number(n ?? 0);
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v);
  };

  const currencyLabel = currencyCode || "ZAR";

  const fmtPct = (n: number | null | undefined) =>
    n == null ? "–" : `${n.toFixed(1)}%`;

  const fmtDisplayDate = (value: string) => {
    if (!value) return "";
    const [y, m, d] = value.split("-");
    if (!y || !m || !d) return value;
    return `${d}/${m}/${y}`;
  };

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
          <div style={{ marginTop: 16 }}>
            <InlineStack gap="300" wrap align="end">
              <div style={{ minWidth: 160 }}>
                <Text as="span" variant="bodySm" tone="subdued">
                  Time period
                </Text>
                <select
                  value={preset}
                  onChange={(e) => {
                    const value = e.target.value as "thisMonth" | "lastMonth" | "custom";
                    setPreset(value);
                    const now = new Date();
                    const utcNow = new Date(
                      Date.UTC(
                        now.getUTCFullYear(),
                        now.getUTCMonth(),
                        now.getUTCDate(),
                      ),
                    );
                    let start = utcNow;
                    let end = utcNow;
                    if (value === "thisMonth") {
                      start = new Date(
                        Date.UTC(
                          utcNow.getUTCFullYear(),
                          utcNow.getUTCMonth(),
                          1,
                        ),
                      );
                    } else if (value === "lastMonth") {
                      const firstThis = new Date(
                        Date.UTC(
                          utcNow.getUTCFullYear(),
                          utcNow.getUTCMonth(),
                          1,
                        ),
                      );
                      start = new Date(
                        Date.UTC(
                          firstThis.getUTCFullYear(),
                          firstThis.getUTCMonth() - 1,
                          1,
                        ),
                      );
                      end = new Date(
                        Date.UTC(
                          firstThis.getUTCFullYear(),
                          firstThis.getUTCMonth(),
                          0,
                        ),
                      );
                    }
                    if (value !== "custom") {
                      setSince(fmtYMD(start));
                      setUntil(fmtYMD(end));
                    }
                  }}
                  style={{
                    width: "100%",
                    marginTop: 4,
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.4)",
                    background: "rgba(0,0,0,0.15)",
                    color: "white",
                    fontSize: 13,
                  }}
                >
                  <option value="thisMonth">This month</option>
                  <option value="lastMonth">Last month</option>
                  <option value="custom">Custom range</option>
                </select>
              </div>
              <div style={{ minWidth: 140 }}>
                <Text as="span" variant="bodySm" tone="subdued">
                  Start date
                </Text>
                <input
                  type="date"
                  value={since}
                  onChange={(e) => {
                    setSince(e.target.value);
                    setPreset("custom");
                  }}
                  style={{
                    width: "100%",
                    marginTop: 4,
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.4)",
                    background: "rgba(0,0,0,0.1)",
                    color: "white",
                    fontSize: 13,
                  }}
                />
              </div>
              <div style={{ minWidth: 140 }}>
                <Text as="span" variant="bodySm" tone="subdued">
                  End date
                </Text>
                <input
                  type="date"
                  value={until}
                  onChange={(e) => {
                    setUntil(e.target.value);
                    setPreset("custom");
                  }}
                  style={{
                    width: "100%",
                    marginTop: 4,
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.4)",
                    background: "rgba(0,0,0,0.1)",
                    color: "white",
                    fontSize: 13,
                  }}
                />
              </div>
            </InlineStack>
          </div>
          <div style={{ marginTop: 20 }}>
            <Text as="p" variant="bodySm">
              {heroTitle} for {fmtDisplayDate(since)} → {fmtDisplayDate(until)}
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
                  {currencyLabel} {fmtMoney(totalSalesCurr)}
                </Text>
                <Text as="p" variant="bodySm">
                  vs {currencyLabel} {fmtMoney(totalSalesPrev)} last year
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
                    {(totalSalesDelta ?? 0) >= 0 ? "↑" : "↓"} {currencyLabel} {fmtMoney(
                      Math.abs(totalSalesDelta)
                    )} ({fmtPct(totalSalesDeltaPct)})
                  </Text>
                </div>
              </div>
              <div
                style={{
                  background: "rgba(255,255,255,0.12)",
                  padding: 16,
                  borderRadius: 12,
                  minWidth: 220,
                }}
              >
                <Text as="p" variant="bodySm" tone="subdued">
                  Total units ({yearB})
                </Text>
                <Text as="p" variant="headingLg">
                  {fmtMoney(totalQtyCurr)} units
                </Text>
                <Text as="p" variant="bodySm">
                  vs {fmtMoney(totalQtyPrev)} units last year
                </Text>
                <div
                  style={{
                    marginTop: 8,
                    padding: "4px 10px",
                    borderRadius: 999,
                    display: "inline-block",
                    background:
                      (totalQtyDelta ?? 0) >= 0
                        ? "rgba(46,213,115,0.35)"
                        : "rgba(231,76,60,0.35)",
                  }}
                >
                  <Text as="span" variant="bodySm">
                    {(totalQtyDelta ?? 0) >= 0 ? "↑" : "↓"} {Math.abs(
                      totalQtyDelta,
                    ).toLocaleString()} units ({fmtPct(totalQtyDeltaPct)})
                  </Text>
                </div>
              </div>
            </InlineStack>
          </div>
        </div>

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

            <div style={{ width: "100%", height: 380 }}>
              <ResponsiveContainer>
                <BarChart
                  data={top20Products}
                  layout="vertical"
                  margin={{ left: 0, right: 40, top: 16, bottom: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) =>
                      metric === "sales"
                        ? `${currencyLabel} ${fmtMoney(v as number)}`
                        : `${v}`
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="product"
                    width={310}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value: any) =>
                      metric === "sales"
                        ? `${currencyLabel} ${fmtMoney(value)}`
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
                          ? `${currencyLabel} ${fmtMoney(v)}`
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

        {/* Story 3 – YoY product comparison (paired bars) */}
        <Card>
          <BlockStack gap="300">
            <div>
              <Text as="h2" variant="headingMd">
                YoY product performance (top 10)
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Compares this year vs last year for your top products by sales
                or quantity.
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
                    color: metric === "sales" ? "#fff" : "#555",
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
                    color: metric === "qty" ? "#fff" : "#555",
                  }}
                >
                  📦 By quantity
                </div>
              </InlineStack>
            </div>
            <div style={{ width: "100%", height: 420 }}>
              {(() => {
                const rows: any[] = annualProducts?.table || [];
                if (!rows.length) {
                  return <Text as="p" variant="bodySm">Not enough data yet.</Text>;
                }

                const valueKeyCurr = metric === "sales" ? "salesCurr" : "qtyCurr";
                const valueKeyPrev = metric === "sales" ? "salesPrev" : "qtyPrev";

                const sorted = rows
                  .slice()
                  .sort((a, b) => (b[valueKeyCurr] as number) - (a[valueKeyCurr] as number))
                  .slice(0, 10)
                  .reverse(); // show #10 at top, #1 at bottom for nicer reading

                return (
                  <ResponsiveContainer>
                    <BarChart
                      data={sorted}
                      layout="vertical"
                      margin={{ left: 0, right: 48, top: 16, bottom: 24 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        type="number"
                        tickFormatter={(v) =>
                          metric === "sales"
                            ? `${currencyLabel} ${fmtMoney(v as number)}`
                            : `${v}`
                        }
                      />
                      <YAxis
                        type="category"
                        dataKey="product"
                        width={320}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value: any, key: any) => {
                          const isPrev = key === valueKeyPrev;
                          const labelYear = isPrev ? `${yearA}` : `${yearB}`;
                          const formatted =
                            metric === "sales"
                              ? `${currencyLabel} ${fmtMoney(value)}`
                              : `${value} units`;
                          return [formatted, labelYear];
                        }}
                      />
                      <Bar
                        dataKey={valueKeyPrev}
                        name={`${yearA}`}
                        radius={[0, 0, 0, 0]}
                        fill="#cfd8dc"
                      />
                      <Bar
                        dataKey={valueKeyCurr}
                        name={`${yearB}`}
                        radius={[0, 6, 6, 0]}
                        fill="#42a5f5"
                      >
                        <LabelList
                          dataKey={valueKeyCurr}
                          position="right"
                          formatter={(v: any) =>
                            metric === "sales"
                              ? `${currencyLabel} ${fmtMoney(v)}`
                              : `${v}`
                          }
                          style={{ fontSize: 11, fill: "#444" }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </BlockStack>
        </Card>

        {/* Story 4 – Products that lost traction */}
        <Card>
          <BlockStack gap="300">
            <div>
              <Text as="h2" variant="headingMd">
                Products that cooled off
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Products that were stronger in the previous period but have
                slipped back this year. Sorted by biggest drop in {" "}
                {metric === "sales" ? "sales" : "units"}.
              </Text>
            </div>
            <div style={{ width: "100%", height: 380 }}>
              {(() => {
                const rows: any[] = annualProducts?.table || [];
                if (!rows.length) {
                  return (
                    <Text as="p" variant="bodySm">
                      Not enough data yet.
                    </Text>
                  );
                }

                const deltaKey = metric === "sales" ? "salesDelta" : "qtyDelta";
                const losers = rows
                  .filter((r) => (r[deltaKey] as number) < 0)
                  .sort(
                    (a, b) => (a[deltaKey] as number) - (b[deltaKey] as number),
                  )
                  .slice(0, 10)
                  .reverse();

                if (!losers.length) {
                  return (
                    <Text as="p" variant="bodySm">
                      No products lost meaningful traction in this period.
                    </Text>
                  );
                }

                return (
                  <ResponsiveContainer>
                    <BarChart
                      data={losers}
                      layout="vertical"
                      margin={{ left: 0, right: 48, top: 16, bottom: 24 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        type="number"
                        tickFormatter={(v) =>
                          metric === "sales"
                            ? `${currencyLabel} ${fmtMoney(Math.abs(v as number))}`
                            : `${Math.abs(v as number)}`
                        }
                      />
                      <YAxis
                        type="category"
                        dataKey="product"
                        width={320}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value: any) => {
                          const formatted =
                            metric === "sales"
                              ? `${currencyLabel} ${fmtMoney(Math.abs(value))}`
                              : `${Math.abs(value)} units`;
                          return [formatted, "Drop vs last year"];
                        }}
                      />
                      <Bar
                        dataKey={deltaKey}
                        radius={[0, 6, 6, 0]}
                        fill="#e57373"
                      >
                        <LabelList
                          dataKey={deltaKey}
                          position="right"
                          formatter={(v: any) =>
                            metric === "sales"
                              ? `${currencyLabel} ${fmtMoney(Math.abs(v))}`
                              : `${Math.abs(v)}`
                          }
                          style={{ fontSize: 11, fill: "#444" }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </BlockStack>
        </Card>

      </BlockStack>
    </Page>
  );
}
