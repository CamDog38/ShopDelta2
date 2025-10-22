import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "./shopify.server";

// GET /app/api/utm-summary?since=YYYY-MM-DD&until=YYYY-MM-DD
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const since = url.searchParams.get("since");
  const until = url.searchParams.get("until");
  if (!since || !until) {
    return json({ error: "Missing 'since' or 'until' query param (YYYY-MM-DD)" }, { status: 400 });
  }

  const { admin } = await authenticate.admin(request);

  const QUERY = `#graphql
    query OrdersWithUTMs($cursor: String) {
      orders(first: 250, after: $cursor, query: "__RANGE__") {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id
            createdAt
            customerJourneySummary { lastVisit { landingPage } }
            currentTotalPriceSet { shopMoney { amount currencyCode } }
            subtotalPriceSet { shopMoney { amount } }
            totalDiscountsSet { shopMoney { amount } }
            totalTaxSet { shopMoney { amount } }
            totalShippingPriceSet { shopMoney { amount } }
            sourceName
            customer { id numberOfOrders }
            refunds {
              refundLineItems(first: 100) {
                edges { node { quantity lineItem { originalUnitPriceSet { shopMoney { amount } } } } }
              }
            }
            lineItems(first: 100) {
              edges { node { quantity originalUnitPriceSet { shopMoney { amount } } } }
            }
          }
        }
      }
    }
  `;

  type MoneyLike = { amount?: string | number | null; currencyCode?: string | null };
  const toNum = (x: any) => (x == null ? 0 : typeof x === "string" ? parseFloat(x) : (x as number) || 0);

  const parseUTMs = (landingPage?: string | null) => {
    const urls: string[] = [];
    if (landingPage) urls.push(landingPage);
    let utm_campaign: string | null = null;
    let utm_medium: string | null = null;
    for (const u of urls) {
      try {
        const full = u.startsWith("http") ? u : `https://example.com${u.startsWith("/") ? "" : "/"}${u}`;
        const q = new URL(full).searchParams;
        if (!utm_campaign && q.get("utm_campaign")) utm_campaign = q.get("utm_campaign");
        if (!utm_medium && q.get("utm_medium")) utm_medium = q.get("utm_medium");
      } catch {}
    }
    return { utm_campaign, utm_medium };
  };

  let cursor: string | null = null;
  let hasNextPage = true;

  let total_sales = 0;
  let gross_sales = 0;
  let discounts = 0;
  let taxes = 0;
  let total_shipping_charges = 0;
  let total_returns = 0;
  let orders = 0;
  let currency: string | null = null;

  let orders_first_time = 0;
  let orders_returning = 0;
  let total_sales_first_time = 0;
  let total_sales_returning = 0;
  const customerSet = new Set<string>();

  const utmCampaignCounts = new Map<string, number>();
  const utmMediumCounts = new Map<string, number>();

  while (hasNextPage) {
    const range = `created_at:>='${since}T00:00:00Z' created_at:<='${until}T23:59:59Z'`;
    const builtQuery = QUERY.replace("__RANGE__", range.replace(/"/g, '\\"'));
    const res: Response = await admin.graphql(builtQuery, { variables: { cursor } });
    const data: any = await res.json();
    const page: any = data?.data?.orders;
    const edges = (page?.edges ?? []) as any[];

    hasNextPage = !!page?.pageInfo?.hasNextPage;
    cursor = page?.pageInfo?.endCursor ?? null;

    for (const e of edges) {
      const o = e.node;
      orders += 1;

      const curr: MoneyLike = o.currentTotalPriceSet?.shopMoney || {};
      const sub: MoneyLike = o.subtotalPriceSet?.shopMoney || {};
      const disc: MoneyLike = o.totalDiscountsSet?.shopMoney || {};
      const tax: MoneyLike = o.totalTaxSet?.shopMoney || {};
      const ship: MoneyLike = o.totalShippingPriceSet?.shopMoney || {};

      if (!currency && curr.currencyCode) currency = curr.currencyCode || null;

      total_sales += toNum(curr.amount);
      gross_sales += toNum(sub.amount);
      {
        const discAmt = toNum(disc.amount);
        if (discAmt !== 0) discounts += -discAmt;
      }
      taxes += toNum(tax.amount);
      total_shipping_charges += toNum(ship.amount);

      const refundsArr: any[] = o?.refunds ?? [];
      for (const refund of refundsArr) {
        const rlis: any[] = refund?.refundLineItems?.edges ?? [];
        for (const rliEdge of rlis) {
          const rli = rliEdge?.node;
          const qty = toNum(rli?.quantity);
          const price = toNum(rli?.lineItem?.originalUnitPriceSet?.shopMoney?.amount);
          total_returns += qty * price;
        }
      }

      const custId: string | null = o.customer?.id || null;
      const ordersCount: number = o.customer?.numberOfOrders ?? 0;
      if (custId) customerSet.add(custId);
      if (ordersCount <= 1) {
        orders_first_time += 1;
        total_sales_first_time += toNum(curr.amount);
      } else {
        orders_returning += 1;
        total_sales_returning += toNum(curr.amount);
      }

      const { utm_campaign, utm_medium } = parseUTMs(o?.customerJourneySummary?.lastVisit?.landingPage);
      if (utm_campaign) utmCampaignCounts.set(utm_campaign, (utmCampaignCounts.get(utm_campaign) || 0) + 1);
      if (utm_medium) utmMediumCounts.set(utm_medium, (utmMediumCounts.get(utm_medium) || 0) + 1);
    }
  }

  const average_order_value = orders ? total_sales / orders : 0;
  const unique_customers = customerSet.size || 1;
  const amount_spent_per_customer = total_sales / unique_customers;
  const number_of_orders_per_customer = orders / unique_customers;
  const new_customers = orders_first_time;
  const returning_customers = Math.max(0, customerSet.size - new_customers);
  const returning_customer_rate = (new_customers + returning_customers)
    ? (returning_customers / (new_customers + returning_customers)) * 100
    : 0;
  const net_sales = gross_sales + discounts;

  const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

  // Build campaign breakdown (each campaign as a row with metrics)
  const campaignBreakdown: Array<{
    campaign: string;
    orders: number;
    total_sales: number;
    average_order_value: number;
    net_sales: number;
    gross_sales: number;
    discounts: number;
    taxes: number;
    total_shipping_charges: number;
    total_returns: number;
    orders_first_time: number;
    orders_returning: number;
    total_sales_first_time: number;
    total_sales_returning: number;
    new_customers: number;
    returning_customers: number;
    amount_spent_per_customer: number;
    number_of_orders_per_customer: number;
    returning_customer_rate: number;
  }> = [];

  // Re-iterate through edges to build per-campaign metrics
  cursor = null;
  hasNextPage = true;
  const campaignMetrics = new Map<string, {
    orders: number;
    total_sales: number;
    gross_sales: number;
    discounts: number;
    taxes: number;
    total_shipping_charges: number;
    total_returns: number;
    orders_first_time: number;
    orders_returning: number;
    total_sales_first_time: number;
    total_sales_returning: number;
    customers: Set<string>;
  }>();

  while (hasNextPage) {
    const range = `created_at:>='${since}T00:00:00Z' created_at:<='${until}T23:59:59Z'`;
    const builtQuery = QUERY.replace("__RANGE__", range.replace(/"/g, '\\"'));
    const res: Response = await admin.graphql(builtQuery, { variables: { cursor } });
    const data: any = await res.json();
    const page: any = data?.data?.orders;
    const edges = (page?.edges ?? []) as any[];

    hasNextPage = !!page?.pageInfo?.hasNextPage;
    cursor = page?.pageInfo?.endCursor ?? null;

    for (const e of edges) {
      const o = e.node;
      const { utm_campaign } = parseUTMs(o?.customerJourneySummary?.lastVisit?.landingPage);
      if (!utm_campaign) continue; // Skip orders without campaign

      if (!campaignMetrics.has(utm_campaign)) {
        campaignMetrics.set(utm_campaign, {
          orders: 0,
          total_sales: 0,
          gross_sales: 0,
          discounts: 0,
          taxes: 0,
          total_shipping_charges: 0,
          total_returns: 0,
          orders_first_time: 0,
          orders_returning: 0,
          total_sales_first_time: 0,
          total_sales_returning: 0,
          customers: new Set(),
        });
      }

      const m = campaignMetrics.get(utm_campaign)!;
      const curr: MoneyLike = o.currentTotalPriceSet?.shopMoney || {};
      const sub: MoneyLike = o.subtotalPriceSet?.shopMoney || {};
      const disc: MoneyLike = o.totalDiscountsSet?.shopMoney || {};
      const tax: MoneyLike = o.totalTaxSet?.shopMoney || {};
      const ship: MoneyLike = o.totalShippingPriceSet?.shopMoney || {};

      m.orders += 1;
      m.total_sales += toNum(curr.amount);
      m.gross_sales += toNum(sub.amount);
      m.discounts += -toNum(disc.amount);
      m.taxes += toNum(tax.amount);
      m.total_shipping_charges += toNum(ship.amount);

      const refundsArr: any[] = o?.refunds ?? [];
      for (const refund of refundsArr) {
        const rlis: any[] = refund?.refundLineItems?.edges ?? [];
        for (const rliEdge of rlis) {
          const rli = rliEdge?.node;
          m.total_returns += toNum(rli?.quantity) * toNum(rli?.lineItem?.originalUnitPriceSet?.shopMoney?.amount);
        }
      }

      const custId: string | null = o.customer?.id || null;
      const ordersCount: number = o.customer?.numberOfOrders ?? 0;
      if (custId) m.customers.add(custId);
      if (ordersCount <= 1) {
        m.orders_first_time += 1;
        m.total_sales_first_time += toNum(curr.amount);
      } else {
        m.orders_returning += 1;
        m.total_sales_returning += toNum(curr.amount);
      }
    }
  }

  // Build breakdown rows
  for (const [campaign, metrics] of campaignMetrics.entries()) {
    const aov = metrics.orders ? metrics.total_sales / metrics.orders : 0;
    const unique_cust = metrics.customers.size || 1;
    const amt_per_cust = metrics.total_sales / unique_cust;
    const orders_per_cust = metrics.orders / unique_cust;
    const ret_cust_rate = (metrics.orders_first_time + metrics.orders_returning)
      ? (metrics.orders_returning / (metrics.orders_first_time + metrics.orders_returning)) * 100
      : 0;

    campaignBreakdown.push({
      campaign,
      orders: metrics.orders,
      total_sales: round(metrics.total_sales),
      average_order_value: round(aov),
      net_sales: round(metrics.gross_sales + metrics.discounts),
      gross_sales: round(metrics.gross_sales),
      discounts: round(metrics.discounts),
      taxes: round(metrics.taxes),
      total_shipping_charges: round(metrics.total_shipping_charges),
      total_returns: round(metrics.total_returns),
      orders_first_time: metrics.orders_first_time,
      orders_returning: metrics.orders_returning,
      total_sales_first_time: round(metrics.total_sales_first_time),
      total_sales_returning: round(metrics.total_sales_returning),
      new_customers: metrics.orders_first_time,
      returning_customers: Math.max(0, unique_cust - metrics.orders_first_time),
      amount_spent_per_customer: round(amt_per_cust),
      number_of_orders_per_customer: round(orders_per_cust),
      returning_customer_rate: round(ret_cust_rate),
    });
  }

  return json({
    campaigns: campaignBreakdown,
    currency: currency || null,
  });
};

function top<T extends string>(m: Map<T, number>): T | null {
  let best: T | null = null; let bestN = -1;
  for (const [k, v] of m.entries()) {
    if (v > bestN) { best = k; bestN = v; }
  }
  return best;
}
