// Fallback to any for admin context
export type ShopifyAdmin = any;

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

function monthRange(y: number, m1to12: number) {
  const s = new Date(Date.UTC(y, m1to12 - 1, 1));
  const e = new Date(Date.UTC(y, m1to12, 0, 23, 59, 59, 999));
  return { s, e };
}

function fmtYM(y: number, m1to12: number) {
  const d = new Date(Date.UTC(y, m1to12 - 1, 1));
  return `${d.toLocaleString('en-US',{ month: 'short' })} ${y}`;
}

export async function computeMoMDefaultFromYoYAggregate(params: { admin: ShopifyAdmin; yearA: number; yearB: number; month: number; }) {
  const { admin, yearA, yearB, month } = params;
  const { s: sA, e: eA } = monthRange(yearA, month);
  const { s: sB, e: eB } = monthRange(yearB, month);
  const labelA = fmtYM(yearA, month);
  const labelB = fmtYM(yearB, month);

  async function fetchTotals(s: Date, e: Date) {
    const search = `processed_at:>='${s.toISOString()}' processed_at:<='${e.toISOString()}'`;
    let after: string | null = null; let qty = 0; let sales = 0;
    while (true) {
      const res: Response = await admin.graphql(ORDERS_QUERY, { variables: { first: 250, search, after } });
      const data = await res.json();
      const edges = (data as any)?.data?.orders?.edges ?? [];
      for (const ed of edges) {
        const liEdges = ed?.node?.lineItems?.edges ?? [];
        for (const li of liEdges) {
          const q = li?.node?.quantity ?? 0; qty += q;
          const amountStr: string | undefined = li?.node?.discountedTotalSet?.shopMoney?.amount as any;
          const amt = amountStr ? parseFloat(amountStr) : 0; sales += amt;
        }
      }
      const page = (data as any)?.data?.orders;
      if (page?.pageInfo?.hasNextPage) after = edges.length ? edges[edges.length - 1]?.cursor : null; else break;
    }
    return { qty, sales };
  }

  const prev = await fetchTotals(sA, eA);
  const curr = await fetchTotals(sB, eB);

  const rows = [{
    period: `${labelA} → ${labelB}`,
    qtyCurr: curr.qty,
    qtyPrev: prev.qty,
    qtyDelta: curr.qty - prev.qty,
    qtyDeltaPct: prev.qty ? (((curr.qty - prev.qty) / prev.qty) * 100) : null,
    salesCurr: curr.sales,
    salesPrev: prev.sales,
    salesDelta: curr.sales - prev.sales,
    salesDeltaPct: prev.sales ? (((curr.sales - prev.sales) / prev.sales) * 100) : null,
  }];

  const comparison = {
    mode: 'mom' as const,
    current: { qty: curr.qty, sales: curr.sales },
    previous: { qty: prev.qty, sales: prev.sales },
    deltas: {
      qty: curr.qty - prev.qty,
      qtyPct: prev.qty ? (((curr.qty - prev.qty) / prev.qty) * 100) : null,
      sales: curr.sales - prev.sales,
      salesPct: prev.sales ? (((curr.sales - prev.sales) / prev.sales) * 100) : null,
    },
    prevRange: { start: sA.toISOString().slice(0,10), end: eA.toISOString().slice(0,10) },
  };

  const headers = [
    'Period',
    `Qty (${labelB})`, `Qty (${labelA})`, 'Qty Δ', 'Qty Δ%',
    `Sales (${labelB})`, `Sales (${labelA})`, 'Sales Δ', 'Sales Δ%'
  ];

  return { comparison, rows, headers };
}

export async function computeMoMDefaultFromYoYProduct(params: { admin: ShopifyAdmin; yearA: number; yearB: number; month: number; }) {
  const { admin, yearA, yearB, month } = params;
  const { s: sA, e: eA } = monthRange(yearA, month);
  const { s: sB, e: eB } = monthRange(yearB, month);
  const labelA = fmtYM(yearA, month);
  const labelB = fmtYM(yearB, month);

  async function fetchTotalsPerProduct(s: Date, e: Date) {
    const search = `processed_at:>='${s.toISOString()}' processed_at:<='${e.toISOString()}'`;
    let after: string | null = null;
    const counts = new Map<string, { title: string; qty: number; sales: number }>();
    while (true) {
      const res: Response = await admin.graphql(ORDERS_QUERY, { variables: { first: 250, search, after } });
      const data = await res.json();
      const edges = (data as any)?.data?.orders?.edges ?? [];
      for (const ed of edges) {
        const liEdges = ed?.node?.lineItems?.edges ?? [];
        for (const li of liEdges) {
          const qty = li?.node?.quantity ?? 0;
          const amountStr: string | undefined = li?.node?.discountedTotalSet?.shopMoney?.amount as any;
          const amt = amountStr ? parseFloat(amountStr) : 0;
          const p = li?.node?.product;
          const fallbackTitle: string = li?.node?.title ?? 'Unknown product';
          const pid: string = p?.id ?? `li:${fallbackTitle}`;
          const title: string = p?.title ?? fallbackTitle;
          if (!counts.has(pid)) counts.set(pid, { title, qty: 0, sales: 0 });
          const acc = counts.get(pid)!;
          acc.qty += qty; acc.sales += amt;
        }
      }
      const page = (data as any)?.data?.orders;
      if (page?.pageInfo?.hasNextPage) after = edges.length ? edges[edges.length - 1]?.cursor : null; else break;
    }
    return counts;
  }

  const prev = await fetchTotalsPerProduct(sA, eA);
  const curr = await fetchTotalsPerProduct(sB, eB);
  const keys = new Set<string>([...prev.keys(), ...curr.keys()]);
  const rows: Array<Record<string, any>> = [];
  let totQtyA = 0, totSalesA = 0, totQtyB = 0, totSalesB = 0;
  for (const pid of keys) {
    const a = prev.get(pid) || { title: pid, qty: 0, sales: 0 };
    const b = curr.get(pid) || { title: a.title, qty: 0, sales: 0 };
    rows.push({
      product: b.title || a.title || pid,
      productSku: '',
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
  const comparison = {
    mode: 'mom' as const,
    current: { qty: totQtyB, sales: totSalesB },
    previous: { qty: totQtyA, sales: totSalesA },
    deltas: {
      qty: totQtyB - totQtyA,
      qtyPct: totQtyA ? (((totQtyB - totQtyA) / totQtyA) * 100) : null,
      sales: totSalesB - totSalesA,
      salesPct: totSalesA ? (((totSalesB - totSalesA) / totSalesA) * 100) : null,
    },
    prevRange: { start: sA.toISOString().slice(0,10), end: eA.toISOString().slice(0,10) },
  };
  const headers = [
    `Product (${labelA} → ${labelB})`,
    `Qty (${labelB})`, `Qty (${labelA})`, 'Qty Δ', 'Qty Δ%',
    `Sales (${labelB})`, `Sales (${labelA})`, 'Sales Δ', 'Sales Δ%'
  ];
  return { comparison, rows: rows.slice(0, 100), headers };
}
