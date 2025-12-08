"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";

export function TotalRevenueSlide({ slide }: { slide: Slide }) {
  const { amount, previousYear, growthPercent, currencyCode } = slide.payload as {
    amount: number;
    previousYear: number;
    growthPercent: number;
    currencyCode?: string | null;
  };

  const currency = currencyCode || "USD";

  const pct = Number.isFinite(growthPercent) ? growthPercent : 0;
  const isPositive = pct >= 0;
  const formattedPct = Math.abs(pct).toFixed(2);
  const arrow = isPositive ? "↑" : "↓";
  const badgeBgClass = isPositive
    ? "bg-emerald-500/20 border border-emerald-500/30"
    : "bg-rose-500/20 border border-rose-500/30";
  const badgeTextClass = isPositive ? "text-emerald-400" : "text-rose-400";

  const bigNumberClass = isPositive
    ? "text-4xl sm:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 drop-shadow-[0_0_40px_rgba(34,197,94,0.5)]"
    : "text-4xl sm:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-red-400 to-orange-400 drop-shadow-[0_0_40px_rgba(248,113,113,0.5)]";

  const formattedAmount = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  const formattedPrevious = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(previousYear);

  return (
    <div className="relative flex min-h-full w-full flex-col items-center justify-center px-4 sm:px-12 py-8 sm:py-12">
      <motion.div
        className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.6),transparent_55%)]"
        initial={{ opacity: 0, scale: 1.3 }}
        animate={{ opacity: 0.5, scale: 1 }}
        transition={{ duration: 1.5 }}
      />

      {/* Confetti-like particles - fewer on mobile */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full"
          style={{
            background: ["#22c55e", "#10b981", "#34d399", "#6ee7b7", "#fbbf24"][i % 5],
            left: `${10 + Math.random() * 80}%`,
            top: `${10 + Math.random() * 80}%`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
          transition={{ duration: 2, delay: 0.5 + i * 0.1, repeat: Infinity, repeatDelay: 3 }}
        />
      ))}

      <div className="relative z-10 flex flex-col items-center gap-4 sm:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-lg sm:text-xl font-medium text-slate-300 text-center">{slide.title}</h2>
        </motion.div>

        {/* Big revenue number */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
        >
          <div className={bigNumberClass}>{formattedAmount}</div>
        </motion.div>

        {/* Growth badge */}
        <motion.div
          className="flex items-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full ${badgeBgClass}`}>
            <span className={`${badgeTextClass} font-bold text-base sm:text-lg`}>
              {arrow} {formattedPct}%
            </span>
            <span className="text-slate-400 text-xs sm:text-sm ml-2">vs last year</span>
          </div>
        </motion.div>

        {/* Previous year comparison */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <span className="text-slate-500 text-xs sm:text-sm">
            Last year: {formattedPrevious}
          </span>
        </motion.div>

        {slide.subtitle && (
          <motion.p
            className="text-xs sm:text-sm text-slate-200/80 text-center max-w-md mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
          >
            {slide.subtitle}
          </motion.p>
        )}
      </div>
    </div>
  );
}
