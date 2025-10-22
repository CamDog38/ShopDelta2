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

  type MoneyLike = { amount?: string | number | null; currencyCode?: string | null };
  const toNum = (x: any) => (x == null ? 0 : typeof x === "string" ? parseFloat(x) : (x as number) || 0);

  const parseUTMs = (landingSite?: string | null, landingSiteRef?: string | null, referringSite?: string | null) => {
    let utm_campaign: string | null = null;
    let utm_medium: string | null = null;
    let utm_source: string | null = null;
    
    // Priority 1: landingSiteRef (query string Shopify parsed)
    if (landingSiteRef) {
      try {
        const q = new URLSearchParams(landingSiteRef);
        if (q.get("utm_campaign")) utm_campaign = q.get("utm_campaign");
        if (q.get("utm_medium")) utm_medium = q.get("utm_medium");
        if (q.get("utm_source")) utm_source = q.get("utm_source");
      } catch {}
    }
    
    // Priority 2: landingSite (full path with query string)
    if (!utm_campaign || !utm_medium || !utm_source) {
      if (landingSite) {
        try {
          const full = landingSite.startsWith("http") ? landingSite : `https://example.com${landingSite}`;
          const q = new URL(full).searchParams;
          if (!utm_campaign && q.get("utm_campaign")) utm_campaign = q.get("utm_campaign");
          if (!utm_medium && q.get("utm_medium")) utm_medium = q.get("utm_medium");
          if (!utm_source && q.get("utm_source")) utm_source = q.get("utm_source");
        } catch {}
      }
    }
    
    // Priority 3: referringSite (external referrer for medium/source inference)
    if (!utm_medium && referringSite) {
      // Basic referrer-to-medium mapping
      const ref = referringSite.toLowerCase();
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
      } else if (referringSite) {
        utm_medium = utm_medium || "referral";
      }
    }
    
    return { utm_campaign, utm_medium, utm_source };
  };

  // REST pagination
  let pageInfo: any = null;

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

  // Loop REST pages
  // We request minimal fields needed for performance
  const baseQuery: any = {
    status: "any",
    limit: 250,
    created_at_min: `${since}T00:00:00Z`,
    created_at_max: `${until}T23:59:59Z`,
    fields: [
      "id",
      "currency",
      "current_total_price_set",
      "subtotal_price_set",
      "total_discounts_set",
      "total_tax_set",
      "total_shipping_price_set",
      "shipping_lines",
      "tax_lines",
      "refunds",
      "line_items",
      "customer",
      "landing_site",
      "landing_site_ref",
      "referring_site",
    ].join(","),
  };

  // Helper to extract array from REST response
  const getOrdersFrom = (resp: any): any[] => resp?.data?.orders || resp?.body?.orders || resp?.orders || [];

  let resp: any = await admin.rest.get({ path: "/orders.json", query: baseQuery });
  // Some clients put pageInfo on resp.pageInfo; also Link header can be present. We'll reuse client pagination helper when available
  // Process first page
  let ordersPage: any[] = getOrdersFrom(resp);
  while (true) {
    for (const o of ordersPage) {
      orders += 1;

      const curr: MoneyLike = o?.current_total_price_set?.shop_money || {};
      const sub: MoneyLike = o?.subtotal_price_set?.shop_money || {};
      const disc: MoneyLike = o?.total_discounts_set?.shop_money || {};
      const tax: MoneyLike = o?.total_tax_set?.shop_money || {};
      const ship: MoneyLike = o?.total_shipping_price_set?.shop_money || {};

      if (!currency && curr.currencyCode) currency = curr.currencyCode || o?.currency || null;

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
        const rlis: any[] = refund?.refund_line_items ?? [];
        for (const rli of rlis) {
          const qty = toNum(rli?.quantity);
          const price = toNum(rli?.line_item?.price_set?.shop_money?.amount);
          total_returns += qty * price;
        }
      }

      const custId: string | null = o?.customer?.id || null;
      const ordersCount: number = o?.customer?.orders_count ?? 0;
      if (custId) customerSet.add(custId);
      if (ordersCount <= 1) {
        orders_first_time += 1;
        total_sales_first_time += toNum(curr.amount);
      } else {
        orders_returning += 1;
        total_sales_returning += toNum(curr.amount);
      }

      const { utm_campaign, utm_medium, utm_source } = parseUTMs(o?.landing_site, o?.landing_site_ref, o?.referring_site);
      const campaign = utm_campaign || "(not set)";
      const medium = utm_medium || "(not set)";
      const source = utm_source || "(not set)";
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
    // Next page: rely on client pagination if available
    const nextLink: any = resp?.pageInfo?.nextPageUrl || resp?.headers?.get?.("link") || null;
    if (resp?.pageInfo?.nextPageQuery) {
      resp = await admin.rest.get({ path: "/orders.json", query: resp.pageInfo.nextPageQuery });
      ordersPage = getOrdersFrom(resp);
      if (!ordersPage.length) break;
      continue;
    }
    if (nextLink && typeof nextLink === "string") {
      // Fallback: parse page_info from link
      const m = nextLink.match(/page_info=([^&>]+)/);
      const page_info = m ? decodeURIComponent(m[1]) : undefined;
      if (!page_info) break;
      resp = await admin.rest.get({ path: "/orders.json", query: { ...baseQuery, page_info } });
      ordersPage = getOrdersFrom(resp);
      if (!ordersPage.length) break;
      continue;
    }
    break;
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
  const utmRows = Array.from(utmMap.values()).map(s => ({
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
  }));

  // Sort by total_sales descending
  utmRows.sort((a, b) => b.total_sales - a.total_sales);

  return json({
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
    },
    // UTM breakdown
    utmRows,
    currency: currency || null,
  });
};
