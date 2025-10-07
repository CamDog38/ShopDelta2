// Fallback to any for admin context
export type ShopifyAdmin = any;

export type YoYAnnualParams = {
  admin: ShopifyAdmin;
  yearA: number; // previous/base year
  yearB: number; // current/comparison year
  ytd?: boolean; // if true, only compare up to current month of yearB
};

export type YoYResult = {
  comparison: {
    mode: "yoy";
    current: { qty: number; sales: number };
    previous: { qty: number; sales: number };
    deltas: { qty: number; qtyPct: number | null; sales: number; salesPct: number | null };
    prevRange: { start: string; end: string };
  };
  table: Array<Record<string, any>>;
  headers: string[];
};

const ORDERS_QUERY = `#graphql
  query AnalyticsRecentOrders($first: Int!, $search: String, $after: String) {
    orders(first: $first, after: $after, sortKey: PROCESSED_AT, reverse: true, query: $search) {
      pageInfo { hasNextPage }
      edges {
        cursor
        node {
          id
          processedAt
          lineItems(first: 100) {
            edges {
              node {
                quantity
                discountedTotalSet { shopMoney { amount currencyCode } }
                product { id title }
                title
              }
            }
          }
        }
      }
    }
  }
`;

function fmtYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}

function monthLabel(y: number, m1to12: number) {
  const d = new Date(Date.UTC(y, m1to12 - 1, 1));
  return `${d.toLocaleString("en-US", { month: "short" })} ${y}`;
}

async function fetchYearBuckets(admin: ShopifyAdmin, year: number, upToMonth?: number, upToDay?: number) {
  const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const endMonth = (upToMonth && upToMonth >= 1 && upToMonth <= 12) ? upToMonth : 12;
  // If upToDay is provided, cap to that day within endMonth; otherwise, use month end
  const end = (upToDay && endMonth)
    ? new Date(Date.UTC(year, endMonth - 1, upToDay, 23, 59, 59, 999))
    : new Date(Date.UTC(year, endMonth, 0, 23, 59, 59, 999));
  const search = `processed_at:>='${start.toISOString()}' processed_at:<='${end.toISOString()}'`;

  let after: string | null = null;
  const monthly = new Map<string, { label: string; qty: number; sales: number }>();
  let totalQty = 0;
  let totalSales = 0;

  while (true) {
    const res: Response = await admin.graphql(ORDERS_QUERY, { variables: { first: 250, search, after } });
    const data = await res.json();
    const edges = (data as any)?.data?.orders?.edges ?? [];
    for (const e of edges) {
      const processedAt: string = e?.node?.processedAt;
      const d = new Date(processedAt);
      const mKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      if (!monthly.has(mKey)) monthly.set(mKey, { label: monthLabel(d.getUTCFullYear(), d.getUTCMonth() + 1), qty: 0, sales: 0 });
      const liEdges = e?.node?.lineItems?.edges ?? [];
      for (const li of liEdges) {
        const q = li?.node?.quantity ?? 0;
        const amtStr: string | undefined = li?.node?.discountedTotalSet?.shopMoney?.amount as any;
        const amt = amtStr ? parseFloat(amtStr) : 0;
        monthly.get(mKey)!.qty += q;
        monthly.get(mKey)!.sales += amt;
        totalQty += q;
        totalSales += amt;
      }
    }
    const page = (data as any)?.data?.orders;
    if (page?.pageInfo?.hasNextPage) after = edges.length ? edges[edges.length - 1]?.cursor : null; else break;
  }

  return { monthly, totalQty, totalSales, start, end };
}

export async function computeYoYAnnualAggregate(params: YoYAnnualParams): Promise<YoYResult> {
  const { admin, yearA, yearB, ytd } = params;
  const now = new Date();
  const upToMonth = ytd ? Math.max(1, now.getUTCMonth() + 1) : 12;
  const upToDay = ytd ? Math.max(1, now.getUTCDate()) : undefined;

  const { monthly: mA, totalQty: totQtyA, totalSales: totSalesA, start: sA, end: eA } = await fetchYearBuckets(admin, yearA, upToMonth, upToDay);
  const { monthly: mB, totalQty: totQtyB, totalSales: totSalesB, start: sB, end: eB } = await fetchYearBuckets(admin, yearB, upToMonth, upToDay);

  const months: string[] = [];
  for (let m = 1; m <= upToMonth; m++) months.push(String(m).padStart(2, "0"));

  const rows: Array<Record<string, any>> = [];
  for (const mm of months) {
    const kA = `${yearA}-${mm}`;
    const kB = `${yearB}-${mm}`;
    const a = mA.get(kA) || { label: monthLabel(yearA, parseInt(mm, 10)), qty: 0, sales: 0 };
    const b = mB.get(kB) || { label: monthLabel(yearB, parseInt(mm, 10)), qty: 0, sales: 0 };
    rows.push({
      period: `${b.label} vs ${a.label}`,
      qtyCurr: b.qty,
      qtyPrev: a.qty,
      qtyDelta: b.qty - a.qty,
      qtyDeltaPct: a.qty ? (((b.qty - a.qty) / a.qty) * 100) : null,
      salesCurr: b.sales,
      salesPrev: a.sales,
      salesDelta: b.sales - a.sales,
      salesDeltaPct: a.sales ? (((b.sales - a.sales) / a.sales) * 100) : null,
    });
  }

  const comparison = {
    mode: "yoy" as const,
    current: { qty: totQtyB, sales: totSalesB },
    previous: { qty: totQtyA, sales: totSalesA },
    deltas: {
      qty: totQtyB - totQtyA,
      qtyPct: totQtyA ? (((totQtyB - totQtyA) / totQtyA) * 100) : null,
      sales: totSalesB - totSalesA,
      salesPct: totSalesA ? (((totSalesB - totSalesA) / totSalesA) * 100) : null,
    },
    prevRange: { start: fmtYMD(sA), end: fmtYMD(eA) },
  };

  const headers = [
    "Period",
    `Qty (${yearB})`, `Qty (${yearA})`, "Qty Δ", "Qty Δ%",
    `Sales (${yearB})`, `Sales (${yearA})`, "Sales Δ", "Sales Δ%",
  ];

  return { comparison, table: rows, headers };
}

export async function computeYoYAnnualProduct(params: YoYAnnualParams) {
  const { admin, yearA, yearB, ytd } = params;
  const now = new Date();
  const upToMonth = ytd ? Math.max(1, now.getUTCMonth() + 1) : 12;
  const upToDay = ytd ? Math.max(1, now.getUTCDate()) : undefined;

  const startA = new Date(Date.UTC(yearA, 0, 1));
  const endA = upToDay
    ? new Date(Date.UTC(yearA, upToMonth - 1, upToDay, 23, 59, 59, 999))
    : new Date(Date.UTC(yearA, upToMonth, 0, 23, 59, 59, 999));
  const startB = new Date(Date.UTC(yearB, 0, 1));
  const endB = upToDay
    ? new Date(Date.UTC(yearB, upToMonth - 1, upToDay, 23, 59, 59, 999))
    : new Date(Date.UTC(yearB, upToMonth, 0, 23, 59, 59, 999));

  const searchFor = (s: Date, e: Date) => `processed_at:>='${s.toISOString()}' processed_at:<='${e.toISOString()}'`;

  async function fetchTotalsPerProduct(s: Date, e: Date) {
    const search = searchFor(s, e);
    let after: string | null = null;
    const counts = new Map<string, { title: string; qty: number; sales: number }>();

    while (true) {
      const res: Response = await admin.graphql(ORDERS_QUERY, { variables: { first: 250, search, after } });
      const data = await res.json();
      const edges = (data as any)?.data?.orders?.edges ?? [];
      for (const ed of edges) {
        const liEdges = ed?.node?.lineItems?.edges ?? [];
        for (const li of liEdges) {
          const q = li?.node?.quantity ?? 0;
          const amtStr: string | undefined = li?.node?.discountedTotalSet?.shopMoney?.amount as any;
          const amt = amtStr ? parseFloat(amtStr) : 0;
          const p = li?.node?.product;
          const fallbackTitle: string = li?.node?.title ?? "Unknown product";
          const pid: string = p?.id ?? `li:${fallbackTitle}`;
          const title: string = p?.title ?? fallbackTitle;
          if (!counts.has(pid)) counts.set(pid, { title, qty: 0, sales: 0 });
          const acc = counts.get(pid)!;
          acc.qty += q; acc.sales += amt;
        }
      }
      const page = (data as any)?.data?.orders;
      if (page?.pageInfo?.hasNextPage) after = edges.length ? edges[edges.length - 1]?.cursor : null; else break;
    }

    return counts;
  }

  const prev = await fetchTotalsPerProduct(startA, endA);
  const curr = await fetchTotalsPerProduct(startB, endB);

  const keys = new Set<string>([...prev.keys(), ...curr.keys()]);
  const rows: Array<Record<string, any>> = [];
  let totQtyA = 0, totSalesA = 0, totQtyB = 0, totSalesB = 0;

  for (const pid of keys) {
    const a = prev.get(pid) || { title: pid, qty: 0, sales: 0 };
    const b = curr.get(pid) || { title: a.title, qty: 0, sales: 0 };
    rows.push({
      product: b.title || a.title || pid,
      productSku: "",
      qtyCurr: b.qty,
      qtyPrev: a.qty,
      qtyDelta: b.qty - a.qty,
      qtyDeltaPct: a.qty ? (((b.qty - a.qty) / a.qty) * 100) : null,
      salesCurr: b.sales,
      salesPrev: a.sales,
      salesDelta: b.sales - a.sales,
      salesDeltaPct: a.sales ? (((b.sales - a.sales) / a.sales) * 100) : null,
    });
    totQtyA += a.qty; totSalesA += a.sales; totQtyB += b.qty; totSalesB += b.sales;
  }

  rows.sort((x, y) => (y.salesDelta as number) - (x.salesDelta as number));
  const table = rows.slice(0, 100);

  const comparison = {
    mode: "yoy" as const,
    current: { qty: totQtyB, sales: totSalesB },
    previous: { qty: totQtyA, sales: totSalesA },
    deltas: {
      qty: totQtyB - totQtyA,
      qtyPct: totQtyA ? (((totQtyB - totQtyA) / totQtyA) * 100) : null,
      sales: totSalesB - totSalesA,
      salesPct: totSalesA ? (((totSalesB - totSalesA) / totSalesA) * 100) : null,
    },
    prevRange: { start: fmtYMD(startA), end: fmtYMD(endA) },
  };

  const headers = [
    `Product (${yearA} → ${yearB})`,
    `Qty (${yearB})`, `Qty (${yearA})`, "Qty Δ", "Qty Δ%",
    `Sales (${yearB})`, `Sales (${yearA})`, "Sales Δ", "Sales Δ%",
  ];

  return { comparison, table, headers } as YoYResult;
}
