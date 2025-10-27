import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return handleExport(request);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }
  return handleExport(request);
};

async function handleExport(request: Request) {
  try {
    // Authenticate (match analytics export pattern with redirect handling)
    var { admin } = await authenticate.admin(request);

    const url = new URL(request.url);
    const since = url.searchParams.get("since");
    const until = url.searchParams.get("until");
    const spendParam = url.searchParams.get("spend");
    if (!since || !until) {
      return json({ error: "Missing 'since' or 'until'" }, { status: 400 });
    }

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
              customer { id numberOfOrders }
              refunds { refundLineItems(first: 100) { edges { node { quantity lineItem { originalUnitPriceSet { shopMoney { amount } } } } } } }
              lineItems(first: 100) { edges { node { quantity originalUnitPriceSet { shopMoney { amount } } } } }
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
      if ((!utm_campaign || !utm_medium || !utm_source) && landingPage) {
        try {
          const full = landingPage.startsWith("http") ? landingPage : `https://example.com${landingPage}`;
          const q = new URL(full).searchParams;
          if (!utm_campaign && q.get("utm_campaign")) utm_campaign = q.get("utm_campaign");
          if (!utm_medium && q.get("utm_medium")) utm_medium = q.get("utm_medium");
          if (!utm_source && q.get("utm_source")) utm_source = q.get("utm_source");
        } catch {}
      }
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

        const { utm_campaign, utm_medium } = parseUTMs(
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

    const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

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

    utmRows.sort((a, b) => b.total_sales - a.total_sales);

    const summary_ad_spend = utmRows.reduce((acc, r: any) => acc + (r.ad_spend || 0), 0);
    const summary_roas = summary_ad_spend > 0 ? ((gross_sales + discounts) / summary_ad_spend) : null;

    // Build workbook
    // Dynamically import xlsx (avoid bundling issues)
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const header: any[][] = [
      ["Campaign Analytics Export"],
      ["Date Range", `${since} to ${until}`],
      [],
    ];

    const headings = [
      "Campaign","Medium","Total Sales","Orders","AOV","Net Sales","Gross Sales","Discounts","Returns","Taxes","Shipping","Total Returns","Sales (First-Time)","Sales (Returning)","Orders (First-Time)","Orders (Returning)","New Customers","Returning Customers","Spent / Customer","Orders / Customer","Returning Rate","Ad Spend","ROAS"
    ];

    const toMoney = (n: number | null | undefined) => Number(n ?? 0);
    const toPct = (n: number | null | undefined) => (n == null ? null : Math.round((n + Number.EPSILON) * 100) / 100);

    const rows: any[][] = [];
    // Summary row
    const summaryOrders = orders;
    const summaryAOV = summaryOrders ? total_sales / summaryOrders : 0;
    const summaryAmtPerCust = customerSet.size ? total_sales / customerSet.size : 0;
    const summaryOrdersPerCust = customerSet.size ? orders / customerSet.size : 0;
    rows.push([
      "Summary","", toMoney(total_sales), orders, toMoney(summaryAOV), toMoney(gross_sales + discounts), toMoney(gross_sales), toMoney(discounts), toMoney(0), toMoney(taxes), toMoney(total_shipping_charges), toMoney(total_returns), toMoney(total_sales_first_time), toMoney(total_sales_returning), orders_first_time, orders_returning, customerSet.size - orders_first_time, customerSet.size, toMoney(summaryAmtPerCust), summaryOrdersPerCust, toPct((orders_first_time + orders_returning) ? (orders_returning / (orders_first_time + orders_returning)) * 100 : 0), toMoney(summary_ad_spend), summary_roas == null ? null : Math.round((summary_roas + Number.EPSILON) * 100) / 100
    ]);

    // Data rows
    for (const r of utmRows) {
      const aov = r.orders ? r.total_sales / r.orders : 0;
      const amtPerCust = r.customers ? r.total_sales / r.customers : 0;
      const ordersPerCust = r.customers ? r.orders / r.customers : 0;
      const returningRate = (r.orders_first_time + r.orders_returning) ? (r.orders_returning / (r.orders_first_time + r.orders_returning)) * 100 : 0;
      rows.push([
        r.campaign, r.medium, toMoney(r.total_sales), r.orders, toMoney(aov), toMoney(r.net_sales), toMoney(r.gross_sales), toMoney(r.discounts), toMoney(0), toMoney(r.taxes), toMoney(r.shipping), toMoney(r.returns), toMoney(r.total_sales_first_time), toMoney(r.total_sales_returning), r.orders_first_time, r.orders_returning, Math.max(0, r.customers - r.orders_first_time), r.customers, toMoney(amtPerCust), ordersPerCust, toPct(returningRate), toMoney(r.ad_spend), r.roas == null ? null : r.roas
      ]);
    }

    const sheetData = header.concat([headings], rows);
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    // Column widths
    ws["!cols"] = [
      { wch: 24 }, { wch: 14 }, // Campaign, Medium
      { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
      { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 10 }
    ];
    // Apply number formats: money -> #,##0.00; integers -> #,##0; decimals -> 0.00
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    const headerRow = 4; // header rows = 3, headings on row 4
    const moneyCols = new Set([3,5,6,7,8,9,10,11,12,13,14,19,22]); // 1-indexed: C,E,F,G,H,I,J,K,L,M,N,S,V
    const intCols = new Set([4,15,16,17,18]); // D,O,P,Q,R
    const twoDecCols = new Set([20,23]); // T (Orders / Customer), W (ROAS)
    for (let R = headerRow + 1; R <= range.e.r + 1; R++) {
      for (let C = 1; C <= range.e.c + 1; C++) {
        const addr = XLSX.utils.encode_cell({ r: R - 1, c: C - 1 });
        const cell = ws[addr];
        if (!cell || typeof cell.v !== 'number') continue;
        if (moneyCols.has(C)) cell.z = "#,##0.00";
        else if (intCols.has(C)) cell.z = "#,##0";
        else if (twoDecCols.has(C)) cell.z = "0.00";
      }
    }
    XLSX.utils.book_append_sheet(wb, ws, "UTM Breakdown");

    const bin = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const filename = `utm-summary-${since}-to-${until}.xlsx`;
    return new Response(bin, {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename=${filename}`,
      },
    });
  } catch (e: any) {
    if (e instanceof Response) {
      // Propagate Shopify auth redirect response
      throw e;
    }
    return json({ error: "Export failed", details: e?.message || String(e) }, { status: 500 });
  }
}
