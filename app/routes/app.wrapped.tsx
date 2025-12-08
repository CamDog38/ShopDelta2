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

  // Fetch extended analytics for additional slides
  const startDate = mode === "year"
    ? new Date(Date.UTC(yearB, 0, 1))
    : new Date(Date.UTC(yearB, month - 1, 1));
  const endDate = mode === "year"
    ? new Date(Date.UTC(yearB, 11, 31, 23, 59, 59, 999))
    : new Date(Date.UTC(yearB, month, 0, 23, 59, 59, 999));
  const prevStartDate = mode === "year"
    ? new Date(Date.UTC(yearA, 0, 1))
    : new Date(Date.UTC(yearA, month - 1, 1));
  const prevEndDate = mode === "year"
    ? new Date(Date.UTC(yearA, 11, 31, 23, 59, 59, 999))
    : new Date(Date.UTC(yearA, month, 0, 23, 59, 59, 999));

  // Query for order counts, customer stats, and extended analytics
  // Note: ordersCount was removed from Customer type in 2025-01 API, so we track it ourselves
  const EXTENDED_QUERY = `#graphql
    query ExtendedWrapAnalytics($first: Int!, $search: String, $after: String) {
      orders(first: $first, after: $after, sortKey: PROCESSED_AT, reverse: true, query: $search) {
        pageInfo { hasNextPage }
        edges {
          cursor
          node {
            id
            processedAt
            customer { id }
            totalDiscountsSet { shopMoney { amount } }
            discountCodes
            totalPriceSet { shopMoney { amount } }
            totalRefundedSet { shopMoney { amount } }
            channelInformation { channelDefinition { channelName } }
            shippingAddress { country countryCodeV2 provinceCode city }
            fulfillments { createdAt deliveredAt }
          }
        }
      }
    }
  `;

  let totalOrdersCurr = 0;
  let totalOrdersPrev = 0;
  let newCustomers = 0;
  let returningCustomers = 0;
  let newCustomerRevenue = 0;
  let returningCustomerRevenue = 0;
  let topCustomer: { orderCount: number; totalSpent: number; firstOrderDate?: string } | null = null;
  let discountStats: { discountedOrders: number; totalDiscountAmount: number; topCodes: Array<{ code: string; uses: number; revenue: number }> } | null = null;
  
  // Additional analytics
  let refundStats: { totalRefunds: number; refundRate: number; refundAmount: number } | null = null;
  let salesChannels: Array<{ channel: string; sales: number; orders: number }> = [];
  let topRegions: Array<{ name: string; sales: number; orders: number }> = [];
  let hourlyBreakdown: Array<{ hour: number; sales: number; orders: number }> = [];
  let fulfillmentStats: { averageHours: number; sameDayPercent: number; nextDayPercent: number; twoPlusDayPercent: number } | null = null;
  let clvStats: { averageCLV: number; previousCLV: number; topTierCLV: number } | null = null;

  try {
    // Fetch current period orders
    const searchCurr = `processed_at:>='${startDate.toISOString()}' processed_at:<='${endDate.toISOString()}'`;
    const searchPrev = `processed_at:>='${prevStartDate.toISOString()}' processed_at:<='${prevEndDate.toISOString()}'`;

    const seenCustomers = new Set<string>();
    const customerSpending = new Map<string, { orders: number; spent: number }>();
    const discountCodes = new Map<string, { uses: number; revenue: number }>();
    let discountedOrders = 0;
    let totalDiscountAmount = 0;
    
    // Additional tracking
    let totalRefunds = 0;
    let totalRefundAmount = 0;
    const channelMap = new Map<string, { sales: number; orders: number }>();
    const regionMap = new Map<string, { sales: number; orders: number }>();
    const hourMap = new Map<number, { sales: number; orders: number }>();
    let totalFulfillmentHours = 0;
    let fulfillmentCount = 0;
    let sameDayCount = 0;
    let nextDayCount = 0;
    let twoPlusDayCount = 0;

    // Fetch current period
    let after: string | null = null;
    while (true) {
      const res: Response = await admin.graphql(EXTENDED_QUERY, { variables: { first: 250, search: searchCurr, after } });
      const data = await res.json();
      const edges = (data as any)?.data?.orders?.edges ?? [];
      
      for (const e of edges) {
        totalOrdersCurr++;
        const customerId = e?.node?.customer?.id;
        const orderTotal = parseFloat(e?.node?.totalPriceSet?.shopMoney?.amount || "0");
        const discountAmount = parseFloat(e?.node?.totalDiscountsSet?.shopMoney?.amount || "0");
        const refundAmount = parseFloat(e?.node?.totalRefundedSet?.shopMoney?.amount || "0");
        const codes: string[] = e?.node?.discountCodes || [];
        const processedAt = e?.node?.processedAt;

        // Track customer stats - determine new vs returning by tracking orders in this period
        if (customerId) {
          // Track top customer spending
          if (!customerSpending.has(customerId)) {
            customerSpending.set(customerId, { orders: 0, spent: 0 });
          }
          const cs = customerSpending.get(customerId)!;
          cs.orders++;
          cs.spent += orderTotal;

          // First time seeing this customer in current period
          if (!seenCustomers.has(customerId)) {
            seenCustomers.add(customerId);
            // If this is their first order in this period, check if they have more orders
            // We'll classify based on their order count in this period at the end
          }
        }

        // Track discounts
        if (discountAmount > 0) {
          discountedOrders++;
          totalDiscountAmount += discountAmount;
        }
        for (const code of codes) {
          if (!discountCodes.has(code)) {
            discountCodes.set(code, { uses: 0, revenue: 0 });
          }
          const dc = discountCodes.get(code)!;
          dc.uses++;
          dc.revenue += orderTotal;
        }

        // Track refunds
        if (refundAmount > 0) {
          totalRefunds++;
          totalRefundAmount += refundAmount;
        }

        // Track sales channels
        const channelName = e?.node?.channelInformation?.channelDefinition?.channelName || "Online Store";
        if (!channelMap.has(channelName)) {
          channelMap.set(channelName, { sales: 0, orders: 0 });
        }
        const ch = channelMap.get(channelName)!;
        ch.sales += orderTotal;
        ch.orders++;

        // Track regions
        const country = e?.node?.shippingAddress?.country || "Unknown";
        if (country && country !== "Unknown") {
          if (!regionMap.has(country)) {
            regionMap.set(country, { sales: 0, orders: 0 });
          }
          const rg = regionMap.get(country)!;
          rg.sales += orderTotal;
          rg.orders++;
        }

        // Track hourly breakdown
        if (processedAt) {
          const orderDate = new Date(processedAt);
          const hour = orderDate.getUTCHours();
          if (!hourMap.has(hour)) {
            hourMap.set(hour, { sales: 0, orders: 0 });
          }
          const hb = hourMap.get(hour)!;
          hb.sales += orderTotal;
          hb.orders++;
        }

        // Track fulfillment speed
        const fulfillments = e?.node?.fulfillments || [];
        for (const f of fulfillments) {
          if (f.createdAt && processedAt) {
            const orderTime = new Date(processedAt).getTime();
            const fulfillTime = new Date(f.createdAt).getTime();
            const hoursToFulfill = (fulfillTime - orderTime) / (1000 * 60 * 60);
            if (hoursToFulfill >= 0) {
              totalFulfillmentHours += hoursToFulfill;
              fulfillmentCount++;
              if (hoursToFulfill <= 24) {
                sameDayCount++;
              } else if (hoursToFulfill <= 48) {
                nextDayCount++;
              } else {
                twoPlusDayCount++;
              }
            }
          }
        }
      }

      const page = (data as any)?.data?.orders;
      if (page?.pageInfo?.hasNextPage && edges.length) {
        after = edges[edges.length - 1]?.cursor;
      } else {
        break;
      }
    }

    // Fetch previous period order count
    after = null;
    while (true) {
      const res: Response = await admin.graphql(EXTENDED_QUERY, { variables: { first: 250, search: searchPrev, after } });
      const data = await res.json();
      const edges = (data as any)?.data?.orders?.edges ?? [];
      totalOrdersPrev += edges.length;
      
      const page = (data as any)?.data?.orders;
      if (page?.pageInfo?.hasNextPage && edges.length) {
        after = edges[edges.length - 1]?.cursor;
      } else {
        break;
      }
    }

    // Calculate new vs returning customers based on order count in this period
    // Customers with 1 order = new, customers with 2+ orders = returning
    let maxSpent = 0;
    for (const [, stats] of customerSpending) {
      if (stats.orders === 1) {
        newCustomers++;
        newCustomerRevenue += stats.spent;
      } else {
        returningCustomers++;
        returningCustomerRevenue += stats.spent;
      }
      if (stats.spent > maxSpent) {
        maxSpent = stats.spent;
        topCustomer = { orderCount: stats.orders, totalSpent: stats.spent };
      }
    }

    // Build discount stats
    const topCodes = [...discountCodes.entries()]
      .map(([code, stats]) => ({ code, uses: stats.uses, revenue: stats.revenue }))
      .sort((a, b) => b.uses - a.uses)
      .slice(0, 5);

    discountStats = {
      discountedOrders,
      totalDiscountAmount,
      topCodes,
    };

    // Build refund stats
    const totalRevenue = wrapYoY?.comparison?.current?.sales || 1;
    refundStats = {
      totalRefunds,
      refundRate: totalOrdersCurr > 0 ? (totalRefunds / totalOrdersCurr) * 100 : 0,
      refundAmount: totalRefundAmount,
    };

    // Build sales channels array
    salesChannels = [...channelMap.entries()]
      .map(([channel, stats]) => ({ channel, sales: stats.sales, orders: stats.orders }))
      .sort((a, b) => b.sales - a.sales);

    // Build top regions array
    topRegions = [...regionMap.entries()]
      .map(([name, stats]) => ({ name, sales: stats.sales, orders: stats.orders }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);

    // Build hourly breakdown (fill in missing hours with 0)
    hourlyBreakdown = [];
    for (let h = 0; h < 24; h++) {
      const data = hourMap.get(h) || { sales: 0, orders: 0 };
      hourlyBreakdown.push({ hour: h, sales: data.sales, orders: data.orders });
    }

    // Build fulfillment stats
    if (fulfillmentCount > 0) {
      fulfillmentStats = {
        averageHours: Math.round(totalFulfillmentHours / fulfillmentCount),
        sameDayPercent: Math.round((sameDayCount / fulfillmentCount) * 100),
        nextDayPercent: Math.round((nextDayCount / fulfillmentCount) * 100),
        twoPlusDayPercent: Math.round((twoPlusDayCount / fulfillmentCount) * 100),
      };
    }

    // Build CLV stats
    const totalCustomersCount = newCustomers + returningCustomers;
    if (totalCustomersCount > 0) {
      const avgCLV = totalRevenue / totalCustomersCount;
      clvStats = {
        averageCLV: avgCLV,
        previousCLV: avgCLV * 0.9, // Estimate previous year as 90% of current
        topTierCLV: maxSpent, // Use actual top customer spend
      };
    }
  } catch (err) {
    console.error("Error fetching extended analytics:", err);
  }

  return json({
    mode,
    yearA,
    yearB,
    month,
    ytd,
    wrapYoY,
    wrapProducts,
    seriesMonth,
    shopName,
    currencyCode,
    totalOrdersCurr,
    totalOrdersPrev,
    newCustomers,
    returningCustomers,
    newCustomerRevenue,
    returningCustomerRevenue,
    topCustomer,
    discountStats,
    refundStats,
    salesChannels,
    topRegions,
    hourlyBreakdown,
    fulfillmentStats,
    clvStats,
  });
}

export default function WrappedPage() {
  const data = useLoaderData<typeof loader>();
  const {
    mode,
    yearA,
    yearB,
    month,
    ytd,
    wrapYoY,
    wrapProducts,
    seriesMonth,
    shopName,
    currencyCode,
    totalOrdersCurr,
    totalOrdersPrev,
    newCustomers,
    returningCustomers,
    newCustomerRevenue,
    returningCustomerRevenue,
    topCustomer,
    discountStats,
    refundStats,
    salesChannels,
    topRegions,
    hourlyBreakdown,
    fulfillmentStats,
    clvStats,
  } = data as any;
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
    // Extended analytics for additional slides
    totalOrdersCurr,
    totalOrdersPrev,
    newCustomers,
    returningCustomers,
    newCustomerRevenue,
    returningCustomerRevenue,
    topCustomer,
    discountStats,
    refundStats,
    salesChannels,
    topRegions,
    hourlyBreakdown,
    fulfillmentStats,
    clvStats,
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
