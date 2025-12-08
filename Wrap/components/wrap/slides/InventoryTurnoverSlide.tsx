"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";

type Category = { name: string; turnover: number; skus: number };

export function InventoryTurnoverSlide({ slide }: { slide: Slide }) {
  const { averageTurnover, industryAverage, totalSkus, fastMovers, slowMovers, outOfStockEvents, categories } = slide.payload as {
    averageTurnover: number;
    industryAverage: number;
    totalSkus: number;
    fastMovers: number;
    slowMovers: number;
    outOfStockEvents: number;
    categories: Category[];
  };

  const maxTurnover = Math.max(...categories.map((c) => c.turnover));
  const isBetterThanAverage = averageTurnover > industryAverage;

  return (
    <div className="relative flex h-full w-full flex-col justify-start px-12 py-8">
      <motion.div
        className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_70%_30%,rgba(6,182,212,0.5),transparent_55%)]"
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

        {/* Main turnover metric */}
        <motion.div
          className="flex items-center justify-center gap-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-center">
            <div className="text-5xl font-bold text-cyan-400">{averageTurnover}x</div>
            <div className="text-sm text-slate-400">avg inventory turnover</div>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-sm ${isBetterThanAverage ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
            {isBetterThanAverage ? "↑" : "↓"} Industry avg: {industryAverage}x
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div
          className="flex justify-center gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="text-center px-4 py-2 rounded-lg bg-white/5">
            <div className="text-xl font-bold text-white">{totalSkus}</div>
            <div className="text-xs text-slate-400">Total SKUs</div>
          </div>
          <div className="text-center px-4 py-2 rounded-lg bg-emerald-500/10">
            <div className="text-xl font-bold text-emerald-400">{fastMovers}</div>
            <div className="text-xs text-slate-400">Fast Movers</div>
          </div>
          <div className="text-center px-4 py-2 rounded-lg bg-amber-500/10">
            <div className="text-xl font-bold text-amber-400">{slowMovers}</div>
            <div className="text-xs text-slate-400">Slow Movers</div>
          </div>
          <div className="text-center px-4 py-2 rounded-lg bg-red-500/10">
            <div className="text-xl font-bold text-red-400">{outOfStockEvents}</div>
            <div className="text-xs text-slate-400">Stockouts</div>
          </div>
        </motion.div>

        {/* Category breakdown */}
        <div className="flex-1 flex flex-col justify-center gap-2">
          <motion.div
            className="text-xs text-slate-500 mb-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Turnover by category:
          </motion.div>
          {categories.map((cat, i) => (
            <motion.div
              key={cat.name}
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.08 }}
            >
              <div className="w-24 text-sm text-slate-300">{cat.name}</div>
              <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full flex items-center justify-end pr-2"
                  initial={{ width: 0 }}
                  animate={{ width: `${(cat.turnover / maxTurnover) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.7 + i * 0.08 }}
                >
                  <span className="text-xs font-bold text-white">{cat.turnover}x</span>
                </motion.div>
              </div>
              <div className="w-16 text-xs text-slate-500 text-right">{cat.skus} SKUs</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
