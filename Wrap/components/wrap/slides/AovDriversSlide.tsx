"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";

type Payload = {
  periodLabel: string;
  compareLabel: string;
  itemsPerOrderCurr: number;
  itemsPerOrderPrev: number;
  avgSellingPriceCurr: number;
  avgSellingPricePrev: number;
  currencyCode?: string | null;
};

function pctChange(curr: number, prev: number) {
  if (!isFinite(curr) || !isFinite(prev)) return 0;
  if (prev === 0) return curr === 0 ? 0 : 100;
  return ((curr - prev) / prev) * 100;
}

function getCurrencySymbol(code: string) {
  try {
    return (
      new Intl.NumberFormat("en", { style: "currency", currency: code })
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value || code
    );
  } catch {
    return code;
  }
}

function formatNumber(value: number, decimals = 2) {
  if (!isFinite(value)) return "0";
  return value.toFixed(decimals);
}

export function AovDriversSlide({ slide }: { slide: Slide }) {
  const {
    periodLabel,
    compareLabel,
    itemsPerOrderCurr,
    itemsPerOrderPrev,
    avgSellingPriceCurr,
    avgSellingPricePrev,
    currencyCode,
  } = slide.payload as Payload;

  const itemsPct = pctChange(itemsPerOrderCurr, itemsPerOrderPrev);
  const aspPct = pctChange(avgSellingPriceCurr, avgSellingPricePrev);

  const maxItems = Math.max(itemsPerOrderCurr, itemsPerOrderPrev, 1e-6);
  const maxAsp = Math.max(avgSellingPriceCurr, avgSellingPricePrev, 1e-6);

  const symbol = getCurrencySymbol(currencyCode || "USD");

  const MetricRow = (props: {
    label: string;
    curr: number;
    prev: number;
    pct: number;
    max: number;
    valuePrefix?: string;
    valueSuffix?: string;
    decimals?: number;
  }) => {
    const {
      label,
      curr,
      prev,
      pct,
      max,
      valuePrefix = "",
      valueSuffix = "",
      decimals = 2,
    } = props;

    const currW = Math.max(6, (curr / max) * 100);
    const prevW = Math.max(6, (prev / max) * 100);
    const positive = pct >= 0;

    return (
      <div className="rounded-2xl bg-black/30 border border-white/10 px-5 py-4 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-white/70">{label}</div>
            <div className="mt-1 text-xl font-semibold">
              {valuePrefix}
              {formatNumber(curr, decimals)}
              {valueSuffix}
              <span className="text-sm font-medium text-white/50">{" "}vs {valuePrefix}{formatNumber(prev, decimals)}{valueSuffix}</span>
            </div>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-sm font-semibold border ${
              positive
                ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/30"
                : "bg-rose-500/20 text-rose-200 border-rose-500/30"
            }`}
          >
            {positive ? "+" : ""}
            {formatNumber(pct, 1)}%
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs text-white/60">
              <span className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-sky-400" />
                {periodLabel}
              </span>
              <span>
                {valuePrefix}
                {formatNumber(curr, decimals)}
                {valueSuffix}
              </span>
            </div>
            <div className="mt-1 h-3 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-400"
                initial={{ width: 0 }}
                animate={{ width: `${currW}%` }}
                transition={{ duration: 0.8, ease: [0.25, 0.8, 0.25, 1] }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-white/60">
              <span className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-slate-400" />
                {compareLabel}
              </span>
              <span>
                {valuePrefix}
                {formatNumber(prev, decimals)}
                {valueSuffix}
              </span>
            </div>
            <div className="mt-1 h-3 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-slate-500 to-slate-400"
                initial={{ width: 0 }}
                animate={{ width: `${prevW}%` }}
                transition={{ duration: 0.8, delay: 0.08, ease: [0.25, 0.8, 0.25, 1] }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex min-h-full w-full flex-col justify-start px-4 sm:px-12 py-8 sm:py-8 sm:h-full">
      <motion.div
        className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_70%_20%,rgba(56,189,248,0.35),transparent_55%),radial-gradient(circle_at_0%_90%,rgba(129,140,248,0.35),transparent_55%)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 1 }}
      />

      <div className="relative z-10 flex h-full flex-col gap-4 sm:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">{slide.title}</h2>
          {slide.subtitle && (
            <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-slate-200/80">{slide.subtitle}</p>
          )}
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:gap-5">
          <MetricRow
            label="Items per order"
            curr={itemsPerOrderCurr}
            prev={itemsPerOrderPrev}
            pct={itemsPct}
            max={maxItems}
            decimals={2}
          />

          <MetricRow
            label="Avg selling price"
            curr={avgSellingPriceCurr}
            prev={avgSellingPricePrev}
            pct={aspPct}
            max={maxAsp}
            valuePrefix={symbol}
            decimals={0}
          />
        </div>
      </div>
    </div>
  );
}
