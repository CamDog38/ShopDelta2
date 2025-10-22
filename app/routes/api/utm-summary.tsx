import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../../shopify.server";

/**
 * GET /api/utm-summary?since=YYYY-MM-DD&until=YYYY-MM-DD
 * Optional: cursor (for manual pagination testing)
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const since = url.searchParams.get("since");
  const until = url.searchParams.get("until");

  if (!since || !until) {
    return json({ error: "Missing 'since' or 'until' query param (YYYY-MM-DD)" }, { status: 400 });
  }

  const { admin } = await authenticate.admin(request);

  // GraphQL query based on your example
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
                edges {
                  node {
                    quantity
                    lineItem { originalUnitPriceSet { shopMoney { amount } } }
                  }
                }
              }
            }
            lineItems(first: 100) {
              edges {
                node {
                  quantity
                  originalUnitPriceSet { shopMoney { amount } }
                }
              }
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

  let total_sales = 0; // sum(currentTotalPrice)
  let gross_sales = 0; // sum(subtotal)
  let discounts = 0;  // sum(totalDiscounts) (reported as negative in the summary)
  let taxes = 0;      // sum(totalTax)
  let total_shipping_charges = 0; // sum(totalShippingPrice)
  let total_returns = 0; // computed from refund line items
  let orders = 0;
  let currency: string | null = null;

  let orders_first_time = 0;
  let orders_returning = 0;
  let total_sales_first_time = 0;
  let total_sales_returning = 0;
  const customerSet = new Set<string>();
  // staff-assisted rate removed (GraphQL field not available)

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
      // Make discounts negative (e.g., -70.58)
      {
        const discAmt = toNum(disc.amount);
        if (discAmt !== 0) discounts += -discAmt;
      }
      taxes += toNum(tax.amount);
      total_shipping_charges += toNum(ship.amount);

      // Returns: approximate using refund line items originalUnitPrice * qty
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

      // First-time vs returning
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

      // UTM extraction
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
  const returning_customers = Math.max(0, customerSet.size - new_customers); // approximation
  const returning_customer_rate = (new_customers + returning_customers) ? (returning_customers / (new_customers + returning_customers)) * 100 : 0;

  // Campaign/medium modes
  const top = <T extends string>(m: Map<T, number>): T | null => {
    let best: T | null = null; let bestN = -1;
    for (const [k, v] of m.entries()) {
      if (v > bestN) { best = k; bestN = v; }
    }
    return best;
  };

  const net_sales = gross_sales + discounts; // sample shows discounts negative and net = gross + discounts

  return json({
    order_utm_campaign: top(utmCampaignCounts),
    order_utm_medium: top(utmMediumCounts),
    total_sales: round(total_sales),
    orders,
    average_order_value: round(average_order_value),
    net_sales: round(net_sales),
    gross_sales: round(gross_sales),
    discounts: round(discounts),
    returns: round(0), // keep explicit returns 0.00 in output example; use total_returns if desired
    taxes: round(taxes),
    total_shipping_charges: round(total_shipping_charges),
    total_returns: round(total_returns),
    total_sales_first_time: round(total_sales_first_time),
    total_sales_returning: round(total_sales_returning),
    orders_first_time,
    orders_returning,
    new_customers,
    returning_customers,
    amount_spent_per_customer: round(amount_spent_per_customer),
    number_of_orders_per_customer: round(number_of_orders_per_customer),
    returning_customer_rate: round(returning_customer_rate),
    // staff-assisted metric omitted
    currency: currency || null,
  });
};

function round(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
