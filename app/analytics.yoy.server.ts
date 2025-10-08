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

// ============ YoY Monthly (Aggregate) ============
export async function computeYoYMonthlyAggregate(params: {
  admin: ShopifyAdmin;
  // Use a range to seed in-range months; function will fetch explicit months when provided
  start: Date;
  end: Date;
  yoyA?: string | null; // YYYY-MM (prev year month)
  yoyB?: string | null; // YYYY-MM (curr year month)
}): Promise<YoYResult> {
  const { admin, start, end, yoyA, yoyB } = params;

  const ORDERS_QUERY = `#graphql
    query AnalyticsRecentOrders($first: Int!, $search: String, $after: String) {
      orders(first: $first, after: $after, sortKey: PROCESSED_AT, reverse: true, query: $search) {
        pageInfo { hasNextPage }
        edges { cursor node { processedAt lineItems(first: 100) { edges { node { quantity discountedTotalSet { shopMoney { amount } } } } } } }
      }
    }
  `;

  const monthLabel = (y: number, m1to12: number) => {
    const d = new Date(Date.UTC(y, m1to12 - 1, 1));
    return `${d.toLocaleString("en-US", { month: "short" })} ${y}`;
  };
  const parseYM = (k: string) => { const [y, m] = k.split('-').map((x)=>parseInt(x,10)); return { y, m }; };
  const monthRange = (y: number, m1to12: number) => {
    const s = new Date(Date.UTC(y, m1to12 - 1, 1));
    const e = new Date(Date.UTC(y, m1to12, 0, 23, 59, 59, 999));
    return { s, e };
  };
  const fetchTotals = async (s: Date, e: Date) => {
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
  };

  const search = `processed_at:>='${start.toISOString()}' processed_at:<='${end.toISOString()}'`;
  let after: string | null = null;
  const monthlyCurr = new Map<string, { label: string; qty: number; sales: number }>();
  while (true) {
    const res: Response = await admin.graphql(ORDERS_QUERY, { variables: { first: 250, search, after } });
    const data = await res.json();
    const edges = (data as any)?.data?.orders?.edges ?? [];
    for (const e of edges) {
      const d = new Date(e?.node?.processedAt);
      const mKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
      if (!monthlyCurr.has(mKey)) monthlyCurr.set(mKey, { label: monthLabel(d.getUTCFullYear(), d.getUTCMonth()+1), qty: 0, sales: 0 });
      const liEdges = e?.node?.lineItems?.edges ?? [];
      for (const li of liEdges) {
        const q = li?.node?.quantity ?? 0;
        const amtStr: string | undefined = li?.node?.discountedTotalSet?.shopMoney?.amount as any;
        const amt = amtStr ? parseFloat(amtStr) : 0;
        monthlyCurr.get(mKey)!.qty += q; monthlyCurr.get(mKey)!.sales += amt;
      }
    }
    const page = (data as any)?.data?.orders;
    if (page?.pageInfo?.hasNextPage) after = edges.length ? edges[edges.length - 1]?.cursor : null; else break;
  }

  // Build previous-year map for the in-range months
  const prevStart = new Date(start); prevStart.setUTCFullYear(prevStart.getUTCFullYear() - 1);
  const prevEnd = new Date(end); prevEnd.setUTCFullYear(prevEnd.getUTCFullYear() - 1);
  const prevSearch = `processed_at:>='${prevStart.toISOString()}' processed_at:<='${prevEnd.toISOString()}'`;
  after = null;
  const monthlyPrev = new Map<string, { qty: number; sales: number }>();
  while (true) {
    const res: Response = await admin.graphql(ORDERS_QUERY, { variables: { first: 250, search: prevSearch, after } });
    const data = await res.json();
    const edges = (data as any)?.data?.orders?.edges ?? [];
    for (const e of edges) {
      const d = new Date(e?.node?.processedAt);
      const mKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
      if (!monthlyPrev.has(mKey)) monthlyPrev.set(mKey, { qty: 0, sales: 0 });
      const liEdges = e?.node?.lineItems?.edges ?? [];
      for (const li of liEdges) {
        const q = li?.node?.quantity ?? 0;
        const amtStr: string | undefined = li?.node?.discountedTotalSet?.shopMoney?.amount as any;
        const amt = amtStr ? parseFloat(amtStr) : 0;
        const acc = monthlyPrev.get(mKey)!; acc.qty += q; acc.sales += amt;
      }
    }
    const page = (data as any)?.data?.orders;
    if (page?.pageInfo?.hasNextPage) after = edges.length ? edges[edges.length - 1]?.cursor : null; else break;
  }

  const rows: Array<Record<string, any>> = [];
  let comparison: YoYResult["comparison"] = {
    mode: "yoy",
    current: { qty: 0, sales: 0 },
    previous: { qty: 0, sales: 0 },
    deltas: { qty: 0, qtyPct: null, sales: 0, salesPct: null },
    prevRange: { start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10) },
  };
  let headers: string[] = ["Period","Qty (Curr)","Qty (Prev)","Qty Δ","Qty Δ%","Sales (Curr)","Sales (Prev)","Sales Δ","Sales Δ%"];

  if (yoyA && yoyB) {
    const { y: yA, m: mA } = parseYM(yoyA);
    const { y: yB, m: mB } = parseYM(yoyB);
    const ra = monthRange(yA, mA); const rb = monthRange(yB, mB);
    const prev = await fetchTotals(ra.s, ra.e);
    const curr = await fetchTotals(rb.s, rb.e);
    headers = ["Period", `Qty (${monthLabel(yB,mB)})`, `Qty (${monthLabel(yA,mA)})`, "Qty Δ", "Qty Δ%", `Sales (${monthLabel(yB,mB)})`, `Sales (${monthLabel(yA,mA)})`, "Sales Δ", "Sales Δ%"];
    comparison = {
      mode: "yoy",
      current: { qty: curr.qty, sales: curr.sales },
      previous: { qty: prev.qty, sales: prev.sales },
      deltas: {
        qty: curr.qty - prev.qty,
        qtyPct: prev.qty ? (((curr.qty - prev.qty) / prev.qty) * 100) : null,
        sales: curr.sales - prev.sales,
        salesPct: prev.sales ? (((curr.sales - prev.sales) / prev.sales) * 100) : null,
      },
      prevRange: { start: ra.s.toISOString().slice(0,10), end: ra.e.toISOString().slice(0,10) },
    };
    rows.push({
      period: `${monthLabel(yB,mB)} vs ${monthLabel(yA,mA)}`,
      qtyCurr: comparison.current.qty,
      qtyPrev: comparison.previous.qty,
      qtyDelta: comparison.deltas.qty,
      qtyDeltaPct: comparison.previous.qty ? (((comparison.deltas.qty) / comparison.previous.qty) * 100) : null,
      salesCurr: comparison.current.sales,
      salesPrev: comparison.previous.sales,
      salesDelta: comparison.current.sales - comparison.previous.sales,
      salesDeltaPct: comparison.previous.sales ? (((comparison.current.sales - comparison.previous.sales) / comparison.previous.sales) * 100) : null,
    });
  } else {
    const ordered = Array.from(monthlyCurr.entries()).sort((a,b)=> (a[0] > b[0] ? 1 : -1));
    const lastTwo = ordered.slice(-2);
    for (const [mKey, currMonth] of lastTwo) {
      const [y, mm] = mKey.split('-').map((x)=>parseInt(x,10));
      // Compute previous year full-month totals, independent of the selected range
      const prevYM = { y: y - 1, m: mm };
      const ra = monthRange(prevYM.y, prevYM.m);
      const rb = monthRange(y, mm);
      const prev = await fetchTotals(ra.s, ra.e);
      const curr = await fetchTotals(rb.s, rb.e);
      rows.push({
        period: `${currMonth.label} vs ${monthLabel(prevYM.y, prevYM.m)}`,
        qtyCurr: curr.qty,
        qtyPrev: prev.qty,
        qtyDelta: curr.qty - prev.qty,
        qtyDeltaPct: prev.qty ? (((curr.qty - prev.qty) / prev.qty) * 100) : null,
        salesCurr: curr.sales,
        salesPrev: prev.sales,
        salesDelta: curr.sales - prev.sales,
        salesDeltaPct: prev.sales ? (((curr.sales - prev.sales) / prev.sales) * 100) : null,
      });
    }
  }

  return { comparison, table: rows, headers };
}

// ============ YoY Monthly (By Product) ============
export async function computeYoYMonthlyProduct(params: {
  admin: ShopifyAdmin;
  start: Date; end: Date;
  yoyA?: string | null; yoyB?: string | null;
}): Promise<{ comparison: YoYResult["comparison"]; table: Array<Record<string,any>>; headers: string[]; yoyPrevMonths: Array<{key:string;label:string}>; yoyCurrMonths: Array<{key:string;label:string}>; }> {
  const { admin, start, end, yoyA, yoyB } = params;
  const ORDERS_QUERY = `#graphql
    query AnalyticsRecentOrders($first: Int!, $search: String, $after: String) {
      orders(first: $first, after: $after, sortKey: PROCESSED_AT, reverse: true, query: $search) {
        pageInfo { hasNextPage }
        edges { cursor node { processedAt lineItems(first: 100) { edges { node { quantity discountedTotalSet { shopMoney { amount } } product { id title } title } } } } }
      }
    }
  `;
  const monthLabel = (k: string) => {
    const [y, mm] = k.split('-').map((x)=>parseInt(x,10));
    const d = new Date(Date.UTC(y, mm-1, 1));
    return `${d.toLocaleString('en-US',{ month:'short' })} ${y}`;
  };

  const searchCurr = `processed_at:>='${start.toISOString()}' processed_at:<='${end.toISOString()}'`;
  let after: string | null = null;
  const monthlyCurrProd = new Map<string, Map<string, { title: string; qty: number; sales: number }>>();
  while (true) {
    const res: Response = await admin.graphql(ORDERS_QUERY, { variables: { first: 250, search: searchCurr, after } });
    const data = await res.json();
    const edges = (data as any)?.data?.orders?.edges ?? [];
    for (const e of edges) {
      const d = new Date(e?.node?.processedAt);
      const mKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
      if (!monthlyCurrProd.has(mKey)) monthlyCurrProd.set(mKey, new Map());
      const liEdges = e?.node?.lineItems?.edges ?? [];
      for (const li of liEdges) {
        const qty = li?.node?.quantity ?? 0;
        const amountStr: string | undefined = li?.node?.discountedTotalSet?.shopMoney?.amount as any;
        const amt = amountStr ? parseFloat(amountStr) : 0;
        const p = li?.node?.product;
        const fallbackTitle: string = li?.node?.title ?? 'Unknown product';
        const pid: string = p?.id ?? `li:${fallbackTitle}`;
        const title: string = p?.title ?? fallbackTitle;
        const mp = monthlyCurrProd.get(mKey)!;
        if (!mp.has(pid)) mp.set(pid, { title, qty: 0, sales: 0 });
        const acc = mp.get(pid)!; acc.qty += qty; acc.sales += amt;
      }
    }
    const page = (data as any)?.data?.orders;
    if (page?.pageInfo?.hasNextPage) after = edges.length ? edges[edges.length - 1]?.cursor : null; else break;
  }

  const prevStart = new Date(start); prevStart.setUTCFullYear(prevStart.getUTCFullYear() - 1);
  const prevEnd = new Date(end); prevEnd.setUTCFullYear(prevEnd.getUTCFullYear() - 1);
  const searchPrev = `processed_at:>='${prevStart.toISOString()}' processed_at:<='${prevEnd.toISOString()}'`;
  after = null;
  const monthlyPrevProd = new Map<string, Map<string, { title: string; qty: number; sales: number }>>();
  while (true) {
    const res: Response = await admin.graphql(ORDERS_QUERY, { variables: { first: 250, search: searchPrev, after } });
    const data = await res.json();
    const edges = (data as any)?.data?.orders?.edges ?? [];
    for (const e of edges) {
      const d = new Date(e?.node?.processedAt);
      const mKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
      if (!monthlyPrevProd.has(mKey)) monthlyPrevProd.set(mKey, new Map());
      const liEdges = e?.node?.lineItems?.edges ?? [];
      for (const li of liEdges) {
        const qty = li?.node?.quantity ?? 0;
        const amountStr: string | undefined = li?.node?.discountedTotalSet?.shopMoney?.amount as any;
        const amt = amountStr ? parseFloat(amountStr) : 0;
        const p = li?.node?.product;
        const fallbackTitle: string = li?.node?.title ?? 'Unknown product';
        const pid: string = p?.id ?? `li:${fallbackTitle}`;
        const title: string = p?.title ?? fallbackTitle;
        const mp = monthlyPrevProd.get(mKey)!;
        if (!mp.has(pid)) mp.set(pid, { title, qty: 0, sales: 0 });
        const acc = mp.get(pid)!; acc.qty += qty; acc.sales += amt;
      }
    }
    const page = (data as any)?.data?.orders;
    if (page?.pageInfo?.hasNextPage) after = edges.length ? edges[edges.length - 1]?.cursor : null; else break;
  }

  // Build pick lists
  const yoyCurrMonths = Array.from(monthlyCurrProd.keys()).sort().map((k) => ({ key: k, label: monthLabel(k) }));
  const yoyPrevMonths = Array.from(monthlyPrevProd.keys()).sort().map((k) => ({ key: k, label: monthLabel(k) }));

  let headers: string[] = ["Product","Qty (Curr)","Qty (Prev)","Qty Δ","Qty Δ%","Sales (Curr)","Sales (Prev)","Sales Δ","Sales Δ%"];
  const rows: Array<Record<string, any>> = [];
  let comparison: YoYResult["comparison"] = {
    mode: "yoy",
    current: { qty: 0, sales: 0 },
    previous: { qty: 0, sales: 0 },
    deltas: { qty: 0, qtyPct: null, sales: 0, salesPct: null },
    prevRange: { start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10) },
  };

  const sumMap = (mp: Map<string,{title:string;qty:number;sales:number}>) => Array.from(mp.values()).reduce((acc,v)=>({qty:acc.qty+v.qty,sales:acc.sales+v.sales}),{qty:0,sales:0});

  if (yoyA && yoyB) {
    const aMap = monthlyPrevProd.get(yoyA) || new Map<string, { title: string; qty: number; sales: number }>();
    const bMap = monthlyCurrProd.get(yoyB) || new Map<string, { title: string; qty: number; sales: number }>();
    const keys = new Set<string>([...Array.from(aMap.keys()), ...Array.from(bMap.keys())]);
    for (const pid of keys) {
      const title = (bMap.get(pid)?.title) || (aMap.get(pid)?.title) || pid;
      const a = aMap.get(pid) || { title, qty: 0, sales: 0 };
      const b = bMap.get(pid) || { title, qty: 0, sales: 0 };
      rows.push({
        product: title,
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
    }
    const totA = sumMap(aMap); const totB = sumMap(bMap);
    const la = monthLabel(yoyA); const lb = monthLabel(yoyB);
    headers = [`Product (${la} → ${lb})`, `Qty (${lb})`, `Qty (${la})`, 'Qty Δ', 'Qty Δ%', `Sales (${lb})`, `Sales (${la})`, 'Sales Δ', 'Sales Δ%'];
    comparison = {
      mode: 'yoy',
      current: { qty: totB.qty, sales: totB.sales },
      previous: { qty: totA.qty, sales: totA.sales },
      deltas: {
        qty: totB.qty - totA.qty,
        qtyPct: totA.qty ? (((totB.qty - totA.qty) / totA.qty) * 100) : null,
        sales: totB.sales - totA.sales,
        salesPct: totA.sales ? (((totB.sales - totA.sales) / totA.sales) * 100) : null,
      },
      prevRange: { start: `${yoyA}-01`, end: `${yoyA}-28` },
    };
  } else {
    // Default: show last two in-range months only
    const ordered = Array.from(monthlyCurrProd.keys()).sort();
    const lastTwo = ordered.slice(-2);
    for (const k of lastTwo) {
      const bMap = monthlyCurrProd.get(k) || new Map();
      const [y,mm] = k.split('-').map((x)=>parseInt(x,10));
      const aKey = `${y-1}-${String(mm).padStart(2,'0')}`;
      const aMap = monthlyPrevProd.get(aKey) || new Map();
      const keys = new Set<string>([...Array.from(aMap.keys()), ...Array.from(bMap.keys())]);
      for (const pid of keys) {
        const title = (bMap.get(pid)?.title) || (aMap.get(pid)?.title) || pid;
        const a = aMap.get(pid) || { title, qty: 0, sales: 0 };
        const b = bMap.get(pid) || { title, qty: 0, sales: 0 };
        rows.push({ product: title, productSku: '', qtyCurr: b.qty, qtyPrev: a.qty, qtyDelta: b.qty - a.qty, qtyDeltaPct: a.qty ? (((b.qty - a.qty) / a.qty) * 100) : null, salesCurr: b.sales, salesPrev: a.sales, salesDelta: b.sales - a.sales, salesDeltaPct: a.sales ? (((b.sales - a.sales) / a.sales) * 100) : null });
      }
    }
    const last = lastTwo[lastTwo.length-1] || ordered[ordered.length-1];
    const [y,mm] = (last||'').split('-').map((x)=>parseInt(x,10));
    const la = y && mm ? monthLabel(`${y-1}-${String(mm).padStart(2,'0')}`) : 'Prev';
    const lb = last ? monthLabel(last) : 'Curr';
    headers = [`Product (${la} → ${lb})`, `Qty (${lb})`, `Qty (${la})`, 'Qty Δ', 'Qty Δ%', `Sales (${lb})`, `Sales (${la})`, 'Sales Δ', 'Sales Δ%'];
  }

  rows.sort((x, y) => (y.salesDelta as number) - (x.salesDelta as number));
  return { comparison, table: rows.slice(0, 100), headers, yoyPrevMonths, yoyCurrMonths };
}
