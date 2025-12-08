"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";

type Segment = { name: string; clv: number; customers: number; percent: number };

export function CustomerLifetimeValueSlide({ slide }: { slide: Slide }) {
  const { averageCLV, previousYear, growthPercent, topTierCLV, segments } = slide.payload as {
    averageCLV: number;
    previousYear: number;
    growthPercent: number;
    topTierCLV: number;
    segments: Segment[];
  };

  const colors = ["#f59e0b", "#8b5cf6", "#3b82f6", "#6b7280"];

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-12">
      <motion.div
        className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.5),transparent_55%)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 1 }}
      />

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-2xl">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-2xl font-semibold tracking-tight">{slide.title}</h2>
          {slide.subtitle && (
            <p className="mt-1 text-sm text-slate-200/80">{slide.subtitle}</p>
          )}
        </motion.div>

        {/* Main CLV number */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400">
            ${averageCLV}
          </div>
          <div className="text-sm text-slate-400 mt-1">average customer lifetime value</div>
          <motion.div
            className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <span className="text-emerald-400 font-bold">+{growthPercent}%</span>
            <span className="text-slate-400 text-sm">from ${previousYear}</span>
          </motion.div>
        </motion.div>

        {/* Customer segments visualization */}
        <motion.div
          className="w-full mt-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {/* Stacked bar */}
          <div className="h-12 w-full rounded-xl overflow-hidden flex">
            {segments.map((seg, i) => (
              <motion.div
                key={seg.name}
                className="h-full flex items-center justify-center"
                style={{ backgroundColor: colors[i] }}
                initial={{ width: 0 }}
                animate={{ width: `${seg.percent}%` }}
                transition={{ duration: 0.8, delay: 0.6 + i * 0.1 }}
              >
                {seg.percent >= 10 && (
                  <span className="text-xs font-bold text-white">{seg.percent}%</span>
                )}
              </motion.div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 grid grid-cols-4 gap-4">
            {segments.map((seg, i) => (
              <motion.div
                key={seg.name}
                className="text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.1 }}
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[i] }} />
                  <span className="text-sm font-medium text-white">{seg.name}</span>
                </div>
                <div className="text-lg font-bold" style={{ color: colors[i] }}>${seg.clv}</div>
                <div className="text-xs text-slate-500">{seg.customers.toLocaleString()} customers</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* VIP callout */}
        <motion.div
          className="text-center mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <span className="text-xs text-slate-500">
            Your VIP customers are worth <span className="text-amber-400 font-bold">${topTierCLV}</span> each
          </span>
        </motion.div>
      </div>
    </div>
  );
}
