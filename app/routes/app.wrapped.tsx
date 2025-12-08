import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
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

  const mode: "year" | "month" = modeParam === "month" ? "month" : "year";

  const now = new Date();
  const defaultYearB = now.getUTCFullYear();
  const defaultYearA = defaultYearB - 1;
  const yearB = yearBParam ? parseInt(yearBParam, 10) : defaultYearB;
  const yearA = yearAParam ? parseInt(yearAParam, 10) : defaultYearA;
  const ytd = !!(ytdParam && (/^(1|true)$/i).test(ytdParam));

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
    // Month mode: compare current month-to-date vs the same month last year
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthEnd = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );

    wrapYoY = await computeYoYMonthlyAggregate({
      admin,
      start: monthStart,
      end: monthEnd,
    });

    const monthlyProducts = await computeYoYMonthlyProduct({
      admin,
      start: monthStart,
      end: monthEnd,
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

  return json({ mode, yearA, yearB, ytd, wrapYoY, wrapProducts, seriesMonth, shopName, currencyCode });
}

export default function WrappedPage() {
  const data = useLoaderData<typeof loader>();
  const { mode, yearA, yearB, ytd, wrapYoY, wrapProducts, seriesMonth, shopName, currencyCode } = data as any;

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
                A year-in-review story for your store based on live Shopify analytics.
              </Text>
            </div>
            <div>
              <InlineStack gap="200">
                <Link
                  to="?mode=year"
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
                  to="?mode=month"
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
            <div style={{ borderRadius: 24, overflow: "hidden" }}>
              <WrapPlayer slides={wrapSlides} />
            </div>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
