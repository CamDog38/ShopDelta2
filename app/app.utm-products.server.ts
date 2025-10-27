import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "./shopify.server";

// GET /app/api/utm-products?campaign=CAMPAIGN&medium=MEDIUM&since=YYYY-MM-DD&until=YYYY-MM-DD
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const campaign = url.searchParams.get("campaign");
  const medium = url.searchParams.get("medium");
  const since = url.searchParams.get("since");
  const until = url.searchParams.get("until");

  if (!campaign || !medium || !since || !until) {
    return json(
      { error: "Missing 'campaign', 'medium', 'since', or 'until' query param" },
      { status: 400 }
    );
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
            customerJourneySummary {
              lastVisit {
                landingPage
                referrerUrl
                utmParameters { source medium campaign term content }
              }
            }
            lineItems(first: 100) {
              edges {
                node {
                  id
                  title
                  variantTitle
                  quantity
                  originalUnitPriceSet { shopMoney { amount currencyCode } }
                  product {
                    id
                    title
                    handle
                  }
                  variant {
                    id
                    title
                    sku
                  }
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
  let currency: string | null = null;

  // Track products: key is product ID, value is product data with aggregated stats
  type ProductStats = {
    productId: string;
    productTitle: string;
    productHandle: string;
    variantId: string;
    variantTitle: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    totalRevenue: number;
    orderCount: number;
    orders: Set<string>; // Track unique orders
  };
  const productMap = new Map<string, ProductStats>();

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

      // Parse UTM parameters
      const { utm_campaign, utm_medium } = parseUTMs(
        o?.customerJourneySummary?.lastVisit?.landingPage,
        o?.customerJourneySummary?.lastVisit?.referrerUrl,
        o?.customerJourneySummary?.lastVisit?.utmParameters
      );

      const orderCampaign = utm_campaign || "(not set)";
      const orderMedium = utm_medium || "(not set)";

      // Only include if matches the requested campaign and medium
      if (orderCampaign !== campaign || orderMedium !== medium) {
        continue;
      }

      // Process line items
      const lineItems: any[] = o?.lineItems?.edges ?? [];
      for (const liEdge of lineItems) {
        const li = liEdge?.node;
        if (!li) continue;

        const productId = li?.product?.id || "unknown";
        const productTitle = li?.product?.title || li?.title || "Unknown Product";
        const productHandle = li?.product?.handle || "";
        const variantId = li?.variant?.id || "";
        const variantTitle = li?.variantTitle || li?.variant?.title || "";
        const sku = li?.variant?.sku || "";
        const quantity = toNum(li?.quantity);
        const unitPrice = toNum(li?.originalUnitPriceSet?.shopMoney?.amount);
        const totalRevenue = quantity * unitPrice;

        if (!currency && li?.originalUnitPriceSet?.shopMoney?.currencyCode) {
          currency = li?.originalUnitPriceSet?.shopMoney?.currencyCode;
        }

        const key = `${productId}|${variantId}`;
        if (!productMap.has(key)) {
          productMap.set(key, {
            productId,
            productTitle,
            productHandle,
            variantId,
            variantTitle,
            sku,
            quantity: 0,
            unitPrice,
            totalRevenue: 0,
            orderCount: 0,
            orders: new Set(),
          });
        }

        const stats = productMap.get(key)!;
        stats.quantity += quantity;
        stats.totalRevenue += totalRevenue;
        stats.orders.add(o.id); // Track unique orders
      }
    }
  }

  const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

  // Build product rows
  const productRows = Array.from(productMap.values())
    .map(p => ({
      productId: p.productId,
      productTitle: p.productTitle,
      productHandle: p.productHandle,
      variantId: p.variantId,
      variantTitle: p.variantTitle,
      sku: p.sku,
      quantity: p.quantity,
      unitPrice: round(p.unitPrice),
      totalRevenue: round(p.totalRevenue),
      orderCount: p.orders.size, // Use unique order count
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  return json({
    campaign,
    medium,
    since,
    until,
    productRows,
    currency: currency || "USD",
  });
};
