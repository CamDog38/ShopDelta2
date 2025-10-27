import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "./shopify.server";
import cache, { CACHE_TTL, generateCacheKey } from "./cache.server";

// GET /app/api/utm-summary?since=YYYY-MM-DD&until=YYYY-MM-DD
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const since = url.searchParams.get("since");
  const until = url.searchParams.get("until");
  if (!since || !until) {
    return json({ error: "Missing 'since' or 'until' query param (YYYY-MM-DD)" }, { status: 400 });
  }

  const { admin, session } = await authenticate.admin(request);
  
  // Generate cache key
  const spendParam = url.searchParams.get("spend");
  const cacheKey = generateCacheKey("utm-summary", {
    shop: session.shop,
    since,
    until,
    spend: spendParam || "",
  });
  
  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) {
    return json(cached);
  }

  // Optional: ad spend mapping for ROAS. Pass as JSON string in `spend` query param
  // Format: { "CampaignA|(not set)": 123.45, "MyCampaign|facebook": 456.78 }
  // Keys are "campaign|medium" matching the rows below
  const spendMap = new Map<string, number>();
  if (spendParam) {
    try {
      const obj = JSON.parse(spendParam);
      if (obj && typeof obj === 'object') {
        for (const [k, v] of Object.entries(obj as Record<string, any>)) {
          const num = typeof v === 'number' ? v : parseFloat(String(v));
          if (!isNaN(num)) spendMap.set(k, num);
        }
      }
    } catch {}
  }

  const QUERY = `#graphql
    query OrdersWithUTMs($cursor: String) {
      orders(first: 250, after: $cursor, query: "__RANGE__") {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id
            createdAt
            customerJourneySummary {
              lastVisit {
                landingPage
                referrerUrl
                utmParameters { source medium campaign term content }
              }
            }
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

  const parseUTMs = (
    landingPage?: string | null,
    referrerUrl?: string | null,
    utm?: { source?: string | null; medium?: string | null; campaign?: string | null; term?: string | null; content?: string | null } | null
  ) => {
    let utm_campaign: string | null = utm?.campaign ?? null;
    let utm_medium: string | null = utm?.medium ?? null;
    let utm_source: string | null = utm?.source ?? null;

    // Fallback: parse from landingPage query string
    if ((!utm_campaign || !utm_medium || !utm_source) && landingPage) {
      try {
        const full = landingPage.startsWith("http") ? landingPage : `https://example.com${landingPage}`;
        const q = new URL(full).searchParams;
        if (!utm_campaign && q.get("utm_campaign")) utm_campaign = q.get("utm_campaign");
        if (!utm_medium && q.get("utm_medium")) utm_medium = q.get("utm_medium");
        if (!utm_source && q.get("utm_source")) utm_source = q.get("utm_source");
      } catch {}
    }

    // Fallback: infer medium/source from referrerUrl when medium is missing
    if (!utm_medium && referrerUrl) {
      const ref = referrerUrl.toLowerCase();
      if (ref.includes("facebook.com") || ref.includes("fb.com")) {
        utm_medium = utm_medium || "social";
        utm_source = utm_source || "facebook";
      } else if (ref.includes("instagram.com")) {
        utm_medium = utm_medium || "social";
        utm_source = utm_source || "instagram";
      } else if (ref.includes("google.com")) {
        utm_medium = utm_medium || "organic";
        utm_source = utm_source || "google";
      } else if (ref.includes("twitter.com") || ref.includes("t.co")) {
        utm_medium = utm_medium || "social";
        utm_source = utm_source || "twitter";
      } else {
        utm_medium = utm_medium || "referral";
      }
    }

    return { utm_campaign, utm_medium, utm_source };
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

  // Track by UTM combination key: "campaign|medium"
  type UTMStats = {
    campaign: string;
    medium: string;
    orders: number;
    total_sales: number;
    gross_sales: number;
    discounts: number;
    taxes: number;
    shipping: number;
    returns: number;
    customers: Set<string>;
    orders_first_time: number;
    orders_returning: number;
    total_sales_first_time: number;
    total_sales_returning: number;
  };
  const utmMap = new Map<string, UTMStats>();

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

      const { utm_campaign, utm_medium, utm_source } = parseUTMs(
        o?.customerJourneySummary?.lastVisit?.landingPage,
        o?.customerJourneySummary?.lastVisit?.referrerUrl,
        o?.customerJourneySummary?.lastVisit?.utmParameters
      );
      const campaign = utm_campaign || "(not set)";
      const medium = utm_medium || "(not set)";
      const key = `${campaign}|${medium}`;

      if (!utmMap.has(key)) {
        utmMap.set(key, {
          campaign,
          medium,
          orders: 0,
          total_sales: 0,
          gross_sales: 0,
          discounts: 0,
          taxes: 0,
          shipping: 0,
          returns: 0,
          customers: new Set(),
          orders_first_time: 0,
          orders_returning: 0,
          total_sales_first_time: 0,
          total_sales_returning: 0,
        });
      }
      const stats = utmMap.get(key)!;
      const orderAmount = toNum(curr.amount);
      stats.orders += 1;
      stats.total_sales += orderAmount;
      stats.gross_sales += toNum(sub.amount);
      {
        const discAmt = toNum(disc.amount);
        if (discAmt !== 0) stats.discounts += -discAmt;
      }
      stats.taxes += toNum(tax.amount);
      stats.shipping += toNum(ship.amount);
      // Add returns from refunds
      for (const refund of refundsArr) {
        const rlis: any[] = refund?.refundLineItems?.edges ?? [];
        for (const rliEdge of rlis) {
          const rli = rliEdge?.node;
          const qty = toNum(rli?.quantity);
          const price = toNum(rli?.lineItem?.originalUnitPriceSet?.shopMoney?.amount);
          stats.returns += qty * price;
        }
      }
      if (custId) stats.customers.add(custId);
      if (ordersCount <= 1) {
        stats.orders_first_time += 1;
        stats.total_sales_first_time += orderAmount;
      } else {
        stats.orders_returning += 1;
        stats.total_sales_returning += orderAmount;
      }
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

  // Build UTM breakdown rows
  const utmRows = Array.from(utmMap.values()).map(s => {
    const key = `${s.campaign}|${s.medium}`;
    const ad_spend = spendMap.get(key) || 0;
    const net_for_row = s.gross_sales + s.discounts;
    const roas = ad_spend > 0 ? net_for_row / ad_spend : null;
    return {
      campaign: s.campaign,
      medium: s.medium,
      orders: s.orders,
      total_sales: round(s.total_sales),
      gross_sales: round(s.gross_sales),
      net_sales: round(s.gross_sales + s.discounts),
      discounts: round(s.discounts),
      taxes: round(s.taxes),
      shipping: round(s.shipping),
      returns: round(s.returns),
      customers: s.customers.size,
      orders_first_time: s.orders_first_time,
      orders_returning: s.orders_returning,
      total_sales_first_time: round(s.total_sales_first_time),
      total_sales_returning: round(s.total_sales_returning),
      ad_spend: round(ad_spend),
      roas: roas == null ? null : Math.round((roas + Number.EPSILON) * 100) / 100,
    };
  });

  // Sort by total_sales descending
  utmRows.sort((a, b) => b.total_sales - a.total_sales);

  // Compute summary ad_spend (sum of provided per-row spends) and ROAS
  const summary_ad_spend = utmRows.reduce((acc, r: any) => acc + (r.ad_spend || 0), 0);
  const summary_roas = summary_ad_spend > 0 ? ((gross_sales + discounts) / summary_ad_spend) : null;

  const responseData = {
    // Summary totals
    summary: {
      total_sales: round(total_sales),
      orders,
      customers: customerSet.size,
      average_order_value: round(average_order_value),
      net_sales: round(net_sales),
      gross_sales: round(gross_sales),
      discounts: round(discounts),
      taxes: round(taxes),
      total_shipping_charges: round(total_shipping_charges),
      total_returns: round(total_returns),
      orders_first_time,
      orders_returning,
      total_sales_first_time: round(total_sales_first_time),
      total_sales_returning: round(total_sales_returning),
      new_customers,
      returning_customers,
      amount_spent_per_customer: round(amount_spent_per_customer),
      number_of_orders_per_customer: round(number_of_orders_per_customer),
      returning_customer_rate: round(returning_customer_rate),
      ad_spend: round(summary_ad_spend),
      roas: summary_roas == null ? null : Math.round((summary_roas + Number.EPSILON) * 100) / 100,
    },
    // UTM breakdown
    utmRows,
    currency: currency || null,
  };
  
  // Cache for 10 minutes
  cache.set(cacheKey, responseData, CACHE_TTL.UTM_SUMMARY);
  
  return json(responseData);
};
