"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";

type DailyData = { date: string; revenue: number };

export function SeasonalPeakSlide({ slide }: { slide: Slide }) {
  const { peakDay, peakDate, peakRevenue, averageDayRevenue, multiplier, dailyData, currencyCode } = slide.payload as {
    peakDay: string;
    peakDate: string;
    peakRevenue: number;
    averageDayRevenue: number;
    multiplier: number;
    dailyData: DailyData[];
    currencyCode?: string | null;
  };

  const maxRevenue = Math.max(...dailyData.map((d) => d.revenue));

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
  const currencySymbol = getCurrencySymbol(currencyCode || "USD");

  return (
    <div className="relative flex min-h-full w-full flex-col justify-start px-4 sm:px-12 py-8 sm:py-8 sm:h-full">
      <motion.div
        className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_80%,rgba(249,115,22,0.5),transparent_55%),radial-gradient(circle_at_80%_20%,rgba(234,179,8,0.4),transparent_55%)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 1 }}
      />

      <div className="relative z-10 flex h-full flex-col gap-3 sm:gap-6">
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

        {/* Spike chart */}
        <div className="flex-1 flex items-end justify-center gap-1 sm:gap-2 px-1 sm:px-4 min-h-0">
          {dailyData.map((day, i) => {
            const heightPercent = (day.revenue / maxRevenue) * 100;
            const isPeak = day.date === peakDate;

            return (
              <motion.div
                key={day.date}
                className="flex flex-col items-center gap-1 sm:gap-2 flex-1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <motion.div
                  className={`w-full max-w-8 sm:max-w-16 rounded-t-md sm:rounded-t-lg ${
                    isPeak
                      ? "bg-gradient-to-t from-orange-500 to-yellow-400 shadow-[0_0_30px_rgba(249,115,22,0.5)]"
                      : "bg-gradient-to-t from-slate-600 to-slate-500"
                  }`}
                  style={{ minHeight: 4 }}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(heightPercent * 1.5, 4)}px` }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.08 }}
                />
                <span className={`text-[8px] sm:text-[10px] ${isPeak ? "text-orange-400 font-bold" : "text-slate-400"}`}>
                  {day.date.split(" ")[1]}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Peak callout */}
        <motion.div
          className="flex items-center justify-center gap-3 sm:gap-8 py-2 sm:py-4 px-3 sm:px-6 rounded-lg sm:rounded-xl bg-white/5 border border-white/10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <div className="text-center">
            <div className="text-lg sm:text-3xl font-bold text-orange-400">{currencySymbol}{(peakRevenue / 1000).toFixed(0)}K</div>
            <div className="text-[10px] sm:text-xs text-slate-400">{peakDay}</div>
          </div>
          <div className="h-8 sm:h-12 w-px bg-white/20" />
          <div className="text-center">
            <div className="text-lg sm:text-3xl font-bold text-white">{multiplier}x</div>
            <div className="text-[10px] sm:text-xs text-slate-400">vs avg</div>
          </div>
          <div className="h-8 sm:h-12 w-px bg-white/20" />
          <div className="text-center">
            <div className="text-lg sm:text-3xl font-bold text-slate-400">{currencySymbol}{(averageDayRevenue / 1000).toFixed(1)}K</div>
            <div className="text-[10px] sm:text-xs text-slate-400">avg</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
