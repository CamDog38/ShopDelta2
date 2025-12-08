"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";

export function OrdersCountSlide({ slide }: { slide: Slide }) {
  const { total, previousYear, growthPercent, averagePerDay } = slide.payload as {
    total: number;
    previousYear: number;
    growthPercent: number;
    averagePerDay: number;
  };

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-12">
      <motion.div
        className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_70%,rgba(59,130,246,0.5),transparent_55%),radial-gradient(circle_at_70%_30%,rgba(139,92,246,0.4),transparent_55%)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 1 }}
      />

      <div className="relative z-10 flex flex-col items-center gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-xl font-medium text-slate-300 text-center">{slide.title}</h2>
        </motion.div>

        {/* Package icon animation */}
        <motion.div
          className="relative"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg className="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </motion.div>
        </motion.div>

        {/* Big order count */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3, type: "spring" }}
        >
          <div className="text-7xl font-bold text-white">
            {total.toLocaleString()}
          </div>
          <div className="text-lg text-slate-400 mt-1">orders shipped</div>
        </motion.div>

        {/* Stats row */}
        <motion.div
          className="flex gap-8 mt-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="text-center px-4 py-2 rounded-xl bg-white/5">
            <div className="text-2xl font-bold text-blue-400">+{growthPercent}%</div>
            <div className="text-xs text-slate-400">vs last year</div>
          </div>
          <div className="text-center px-4 py-2 rounded-xl bg-white/5">
            <div className="text-2xl font-bold text-violet-400">{averagePerDay}</div>
            <div className="text-xs text-slate-400">orders/day avg</div>
          </div>
        </motion.div>

        {slide.subtitle && (
          <motion.p
            className="text-sm text-slate-200/80 text-center max-w-md mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            {slide.subtitle}
          </motion.p>
        )}
      </div>
    </div>
  );
}
