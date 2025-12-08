import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { Page, BlockStack, Text, Card, InlineStack } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import type { YoYResult } from "../analytics.yoy.server";
import {
  computeYoYAnnualAggregate,
  computeYoYAnnualProduct,
  computeYoYMonthlyAggregate,
  computeYoYMonthlyProduct,
} from "../analytics.yoy.server";
import wrapStylesUrl from "../../Wrap/globals.css?url";
import { WrapPlayer } from "../../Wrap/components/wrap/WrapPlayer";
import { buildSlides } from "../../Wrap/lib/wrapSlides";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: wrapStylesUrl },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const yearBParam = url.searchParams.get("yearB");
  const yearAParam = url.searchParams.get("yearA");
  const ytdParam = url.searchParams.get("ytd");
  const modeParam = url.searchParams.get("mode");
  const monthParam = url.searchParams.get("month");

  const mode: "year" | "month" = modeParam === "month" ? "month" : "year";

  const now = new Date();
  const defaultYearB = now.getUTCFullYear();
  const defaultYearA = defaultYearB - 1;
  const yearB = yearBParam ? parseInt(yearBParam, 10) : defaultYearB;
  const yearA = yearAParam ? parseInt(yearAParam, 10) : defaultYearA;
  const ytd = !!(ytdParam && (/^(1|true)$/i).test(ytdParam));

  let month = monthParam ? parseInt(monthParam, 10) : now.getUTCMonth() + 1;
  if (!Number.isFinite(month) || month < 1 || month > 12) {
    month = now.getUTCMonth() + 1;
  }

  const { admin } = await authenticate.admin(request);

  const SHOP_QUERY = `#graphql
    query ShopInfoForWrapped {
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

  let wrapYoY: YoYResult;
  let wrapProducts: YoYResult;

  if (mode === "year") {
    wrapYoY = await computeYoYAnnualAggregate({
      admin,
      yearA,
      yearB,
      ytd,
    });

    wrapProducts = await computeYoYAnnualProduct({
      admin,
      yearA,
      yearB,
      ytd,
    }) as any;
  } else {
    // Month mode: compare selected month vs the same month last year
    const mm = Math.min(Math.max(month, 1), 12);
    const mmKey = String(mm).padStart(2, "0");
    const yoyB = `${yearB}-${mmKey}`;
    const yoyA = `${yearA}-${mmKey}`;

    const rangeStart = new Date(Date.UTC(yearA, 0, 1));
    const rangeEnd = new Date(Date.UTC(yearB, 11, 31, 23, 59, 59, 999));

    wrapYoY = await computeYoYMonthlyAggregate({
      admin,
      start: rangeStart,
      end: rangeEnd,
      yoyA,
      yoyB,
    });

    const monthlyProducts = await computeYoYMonthlyProduct({
      admin,
      start: rangeStart,
      end: rangeEnd,
      yoyA,
      yoyB,
    });

    wrapProducts = {
      comparison: monthlyProducts.comparison,
      table: monthlyProducts.table,
      headers: monthlyProducts.headers,
    } as YoYResult;
  }

  const seriesMonth = wrapYoY.table.map((row) => ({
    period: row.period,
    salesCurr: row.salesCurr,
    salesPrev: row.salesPrev,
    salesDelta: row.salesDelta,
  }));

  return json({ mode, yearA, yearB, month, ytd, wrapYoY, wrapProducts, seriesMonth, shopName, currencyCode });
}

export default function WrappedPage() {
  const data = useLoaderData<typeof loader>();
  const { mode, yearA, yearB, month, ytd, wrapYoY, wrapProducts, seriesMonth, shopName, currencyCode } = data as any;
  const navigate = useNavigate();

  const selectedMonth = month as number;
  const monthName = new Date(Date.UTC(yearB, selectedMonth - 1, 1)).toLocaleString(
    "en-US",
    { month: "long" },
  );
  const periodLabel = mode === "year" ? String(yearB) : `${monthName} ${yearB}`;
  const compareLabel = mode === "year" ? String(yearA) : `${monthName} ${yearA}`;

  const handleMonthChange = (value: string) => {
    const m = parseInt(value, 10);
    if (!Number.isFinite(m)) return;
    const params = new URLSearchParams();
    params.set("mode", "month");
    params.set("yearB", String(yearB));
    params.set("month", String(m));
    navigate(`?${params.toString()}`);
  };

  const wrapSlides = buildSlides({
    yearA,
    yearB,
    isYtd: mode === "year" ? ytd : false,
    totalSalesCurr: wrapYoY?.comparison?.current?.sales ?? 0,
    totalSalesPrev: wrapYoY?.comparison?.previous?.sales ?? 0,
    totalQtyCurr: wrapYoY?.comparison?.current?.qty ?? 0,
    totalQtyPrev: wrapYoY?.comparison?.previous?.qty ?? 0,
    salesDeltaPct: wrapYoY?.comparison?.deltas?.salesPct ?? 0,
    qtyDeltaPct: wrapYoY?.comparison?.deltas?.qtyPct ?? 0,
    monthly: seriesMonth || [],
    products: (wrapProducts?.table || []) as Array<{
      product: string;
      salesCurr: number;
      salesPrev: number;
      qtyCurr: number;
      qtyPrev: number;
      salesDelta: number;
      salesDeltaPct: number | null;
    }>,
    shopName,
    currencyCode,
    mode,
    periodLabel,
    compareLabel,
  });

  return (
    <Page>
      <TitleBar title="Wrapped" />
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="300">
            <div>
              <Text as="h2" variant="headingMd">
                Your Shopify Wrapped
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                A story-driven wrap for {mode === "year" ? `your ${yearB} year` : `${periodLabel}`} vs {compareLabel}.
              </Text>
            </div>
            <div>
              <InlineStack gap="200">
                <Link
                  to={`?mode=year&yearB=${yearB}`}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: "none",
                    background:
                      mode === "year"
                        ? "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
                        : "rgba(0,0,0,0.04)",
                    color: mode === "year" ? "white" : "#555",
                  }}
                >
                  Year wrap
                </Link>
                <Link
                  to={`?mode=month&yearB=${yearB}&month=${selectedMonth}`}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: "none",
                    background:
                      mode === "month"
                        ? "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
                        : "rgba(0,0,0,0.04)",
                    color: mode === "month" ? "white" : "#555",
                  }}
                >
                  Month wrap
                </Link>
              </InlineStack>
            </div>
            {mode === "month" && (
              <div>
                <Text as="p" variant="bodySm" tone="subdued">
                  Select month
                </Text>
                <select
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  style={{
                    marginTop: 4,
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid rgba(148,163,184,0.6)",
                    background: "rgba(15,23,42,0.7)",
                    color: "white",
                    fontSize: 13,
                  }}
               >
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const m = idx + 1;
                    const n = new Date(Date.UTC(yearB, m - 1, 1)).toLocaleString(
                      "en-US",
                      { month: "long" },
                    );
                    return (
                      <option key={m} value={m}>
                        {n}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
            <div style={{ borderRadius: 24, overflow: "hidden" }}>
              <WrapPlayer slides={wrapSlides} />
            </div>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
