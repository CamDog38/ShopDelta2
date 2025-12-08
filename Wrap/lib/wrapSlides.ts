import { buildHeatmapLayout, type HeatmapDatum } from "./heatmap";

export type SlideType =
  | "intro"
  | "bigNumber"
  | "topList"
  | "barTimeline"
  | "heatmap"
  | "peakHour"
  | "geoHotspots"
  | "funnel"
  | "customerLoyalty"
  | "cartRecovery"
  | "seasonalPeak"
  | "aovGrowth"
  | "topCustomer"
  | "fastestSelling"
  | "reviews"
  | "totalRevenue"
  | "ordersCount"
  | "refundRate"
  | "discountUsage"
  | "topProducts"
  | "productPerformance"
  | "inventoryTurnover"
  | "customerLifetimeValue"
  | "topReferrers"
  | "fulfillmentSpeed"
  | "recap";

export type Slide = {
  id: string;
  type: SlideType;
  title: string;
  subtitle?: string;
  payload?: any;
};

export type WrapAnalyticsInput = {
  yearA: number;
  yearB: number;
  isYtd?: boolean;
  totalSalesCurr: number;
  totalSalesPrev: number;
  totalQtyCurr: number;
  totalQtyPrev: number;
  salesDeltaPct: number | null;
  qtyDeltaPct: number | null;
  monthly: Array<{
    period: string;
    salesCurr: number;
    salesPrev: number;
    salesDelta: number;
  }>;
  products: Array<{
    product: string;
    salesCurr: number;
    salesPrev: number;
    qtyCurr: number;
    qtyPrev: number;
    salesDelta: number;
    salesDeltaPct: number | null;
  }>;
  shopName?: string | null;
  currencyCode?: string | null;
  mode?: "year" | "month";
  periodLabel?: string;
  compareLabel?: string;
};

export function buildSlides(input: WrapAnalyticsInput): Slide[] {
  const {
    yearA,
    yearB,
    isYtd,
    totalSalesCurr,
    totalSalesPrev,
    totalQtyCurr,
    totalQtyPrev,
    salesDeltaPct,
    qtyDeltaPct,
    monthly,
    products,
    shopName,
    currencyCode,
    mode,
    periodLabel,
    compareLabel,
  } = input;

  const safePct = (v: number | null) => (v == null || !isFinite(v) ? 0 : v);

  const now = new Date();
  const daysInRange = (() => {
    if (!isYtd) return 365;
    if (now.getUTCFullYear() !== yearB) return 365;
    const start = new Date(Date.UTC(yearB, 0, 1));
    const diffMs = now.getTime() - start.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, days);
  })();

  const avgPerDay = Math.round(totalQtyCurr / Math.max(1, daysInRange));

  const topBySales = [...products]
    .sort((a, b) => (b.salesCurr as number) - (a.salesCurr as number))
    .slice(0, 8);

  const emojiPool = ["🧥", "👟", "🎒", "🕶️", "⌚", "🧢", "🧦", "📦"];

  const heatmapData: HeatmapDatum[] = topBySales.map((p, idx) => ({
    id: `prod-${idx}`,
    label: p.product.slice(0, 14),
    name: p.product,
    sector: "Top products",
    value: p.salesCurr,
    changePct: safePct(p.salesDeltaPct ?? 0),
  }));

  const heatmapTiles = buildHeatmapLayout(heatmapData);

  const slides: Slide[] = [];

  const wrapMode: "year" | "month" = mode === "month" ? "month" : "year";
  const effectivePeriodLabel =
    periodLabel || (wrapMode === "year" ? String(yearB) : "This period");
  const effectiveCompareLabel =
    compareLabel || (wrapMode === "year" ? String(yearA) : "last year");

  slides.push({
    id: "intro",
    type: "intro",
    title:
      wrapMode === "year"
        ? `${shopName || "Your store"}'s ${yearB} Shopify Wrapped`
        : `${shopName || "Your store"} in ${effectivePeriodLabel}`,
    subtitle:
      wrapMode === "year"
        ? `A year-over-year look at ${yearB} vs ${yearA}.`
        : `A look at ${effectivePeriodLabel} vs ${effectiveCompareLabel}.`,
  });

  slides.push({
    id: "total-revenue",
    type: "totalRevenue",
    title:
      wrapMode === "year"
        ? "Your total revenue"
        : `Your revenue in ${effectivePeriodLabel}`,
    subtitle:
      wrapMode === "year"
        ? "Every sale, every transaction, every win."
        : `How ${effectivePeriodLabel} performed vs ${effectiveCompareLabel}.`,
    payload: {
      amount: totalSalesCurr,
      previousYear: totalSalesPrev,
      growthPercent: safePct(salesDeltaPct),
      currencyCode,
    },
  });

  slides.push({
    id: "orders-count",
    type: "ordersCount",
    title:
      wrapMode === "year"
        ? "Units shipped this year"
        : `Units shipped in ${effectivePeriodLabel}`,
    subtitle:
      wrapMode === "year"
        ? "A quick view of demand vs last year."
        : `A quick view of demand vs ${effectiveCompareLabel}.`,
    payload: {
      total: totalQtyCurr,
      previousYear: totalQtyPrev,
      growthPercent: safePct(qtyDeltaPct),
      averagePerDay: avgPerDay,
    },
  });

  slides.push({
    id: "top-products",
    type: "topProducts",
    title: "Your bestsellers",
    subtitle: "The products your customers couldn't resist.",
    payload: {
      products: topBySales.map((p, i) => ({
        name: p.product,
        sku: "",
        revenue: p.salesCurr,
        units: p.qtyCurr,
        image: emojiPool[i % emojiPool.length],
      })),
      currencyCode,
    },
  });

  if (heatmapTiles.length) {
    slides.push({
      id: "ecomm-heatmap",
      type: "heatmap",
      title: "Where your revenue came from",
      subtitle:
        "Each tile shows a product's share of revenue and its change vs last year.",
      payload: { tiles: heatmapTiles },
    });
  }

  slides.push({
    id: "recap",
    type: "recap",
    title:
      wrapMode === "year"
        ? "That was your year."
        : `That was ${effectivePeriodLabel}.`,
    subtitle: "Ready to make the next one even bigger?",
    payload: { handle: shopName || "your brand" },
  });

  return slides;
}

// Legacy helper kept for compatibility with the original prototype.
// In this Remix app we always call buildSlides with live analytics input.
export type WrapData = WrapAnalyticsInput;

export function getWrapData(): WrapData {
  return {
    yearA: new Date().getUTCFullYear() - 1,
    yearB: new Date().getUTCFullYear(),
    isYtd: true,
    totalSalesCurr: 0,
    totalSalesPrev: 0,
    totalQtyCurr: 0,
    totalQtyPrev: 0,
    salesDeltaPct: 0,
    qtyDeltaPct: 0,
    monthly: [],
    products: [],
    shopName: null,
  };
}
