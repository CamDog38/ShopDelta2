"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";

export function BarTimelineSlide({ slide }: { slide: Slide }) {
  const months = (slide.payload?.months || []) as {
    month: string;
    posts: number;
    views: number;
  }[];
  const currencyCode = (slide.payload?.currencyCode as string) || "USD";

  const maxViews = Math.max(...months.map((m) => m.views), 1);

  // Get currency symbol
  const getCurrencySymbol = (code: string) => {
    try {
      return new Intl.NumberFormat("en", { style: "currency", currency: code })
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value || code;
    } catch {
      return code;
    }
  };
  const currencySymbol = getCurrencySymbol(currencyCode);

  // Format currency for display
  const formatValue = (value: number) => {
    if (value >= 1000000) return `${currencySymbol}${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${currencySymbol}${(value / 1000).toFixed(0)}K`;
    return `${currencySymbol}${value.toFixed(0)}`;
  };

  // Calculate pixel heights for bars (max 160px)
  const maxBarHeight = 160;

  return (
    <div className="relative flex h-full w-full flex-col justify-center px-12">
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.4),transparent_55%),radial-gradient(circle_at_0%_100%,rgba(129,140,248,0.4),transparent_55%)] opacity-40"
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 0.4, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />

      <div className="relative z-10 flex flex-col gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.8, 0.25, 1] }}
        >
          <h2 className="text-3xl font-semibold tracking-tight">
            {slide.title}
          </h2>
          {slide.subtitle && (
            <p className="mt-1 text-sm text-slate-100/80">{slide.subtitle}</p>
          )}
        </motion.div>

        <div className="mt-4 flex h-64 items-end gap-2 rounded-2xl bg-black/30 px-4 pb-10 pt-3 backdrop-blur-sm border border-white/10">
          {months.map((m, idx) => {
            const barHeight = maxViews > 0 ? Math.max((m.views / maxViews) * maxBarHeight, 8) : 8;
            return (
              <motion.div
                key={`${m.month}-${idx}`}
                className="flex flex-1 flex-col items-center justify-end"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
              >
                <motion.div
                  className="text-[9px] text-slate-300/90 font-medium mb-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + idx * 0.05 }}
                >
                  {m.views > 0 ? formatValue(m.views) : ""}
                </motion.div>
                <motion.div
                  className="w-full max-w-[40px] rounded-t-lg bg-gradient-to-t from-indigo-500 to-sky-400 shadow-[0_4px_20px_rgba(56,189,248,0.4)]"
                  initial={{ height: 0 }}
                  animate={{ height: barHeight }}
                  transition={{ duration: 0.7, ease: [0.25, 0.8, 0.25, 1], delay: 0.2 + idx * 0.05 }}
                />
                <div className="text-[11px] text-slate-200/80 mt-2">{m.month}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
