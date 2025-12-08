"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";

type MonthlyData = { month: string; hours: number };

export function FulfillmentSpeedSlide({ slide }: { slide: Slide }) {
  const { averageHours, previousYear, improvementPercent, sameDay, nextDay, twoPlusDay, onTimeRate, monthlyTrend } = slide.payload as {
    averageHours: number;
    previousYear: number;
    improvementPercent: number;
    sameDay: number;
    nextDay: number;
    twoPlusDay: number;
    onTimeRate: number;
    monthlyTrend: MonthlyData[];
  };

  const maxHours = Math.max(...monthlyTrend.map((m) => m.hours));
  const minHours = Math.min(...monthlyTrend.map((m) => m.hours));

  return (
    <div className="relative flex h-full w-full flex-col justify-start px-12 py-8">
      <motion.div
        className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_80%,rgba(34,197,94,0.5),transparent_55%)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 1 }}
      />

      <div className="relative z-10 flex h-full flex-col gap-5">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-2xl font-semibold tracking-tight">{slide.title}</h2>
          {slide.subtitle && (
            <p className="mt-1 text-sm text-slate-200/80">{slide.subtitle}</p>
          )}
        </motion.div>

        {/* Main metric */}
        <motion.div
          className="flex items-center justify-center gap-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-center">
            <div className="text-6xl font-bold text-emerald-400">{averageHours}h</div>
            <div className="text-sm text-slate-400">avg time to ship</div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium">
              ↓ {improvementPercent}% faster than last year
            </div>
            <div className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm font-medium">
              {onTimeRate}% on-time delivery
            </div>
          </div>
        </motion.div>

        {/* Fulfillment breakdown */}
        <motion.div
          className="flex justify-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="text-center px-6 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="text-2xl font-bold text-emerald-400">{sameDay}%</div>
            <div className="text-xs text-slate-400">Same Day</div>
          </div>
          <div className="text-center px-6 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <div className="text-2xl font-bold text-blue-400">{nextDay}%</div>
            <div className="text-xs text-slate-400">Next Day</div>
          </div>
          <div className="text-center px-6 py-3 rounded-xl bg-slate-500/10 border border-slate-500/20">
            <div className="text-2xl font-bold text-slate-400">{twoPlusDay}%</div>
            <div className="text-xs text-slate-400">2+ Days</div>
          </div>
        </motion.div>

        {/* Monthly trend chart */}
        <motion.div
          className="flex-1 flex items-end justify-center gap-2 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {monthlyTrend.map((month, i) => {
            const heightPercent = ((month.hours - minHours + 5) / (maxHours - minHours + 10)) * 100;
            const isLowest = month.hours === minHours;

            return (
              <div key={month.month} className="flex flex-col items-center gap-1 flex-1">
                <motion.div
                  className={`w-full max-w-8 rounded-t-md ${isLowest ? "bg-emerald-400" : "bg-slate-600"}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPercent}px` }}
                  transition={{ duration: 0.6, delay: 0.6 + i * 0.05 }}
                />
                <span className="text-[9px] text-slate-500">{month.month}</span>
              </div>
            );
          })}
        </motion.div>

        <motion.div
          className="text-center text-xs text-slate-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          Fastest month: <span className="text-emerald-400 font-bold">September</span> at {minHours} hours
        </motion.div>
      </div>
    </div>
  );
}
