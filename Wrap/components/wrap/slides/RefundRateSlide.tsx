"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";

type RefundReason = { reason: string; percent: number };

export function RefundRateSlide({ slide }: { slide: Slide }) {
  const { totalRefunds, refundRate, refundAmount, industryAverage, topReasons } = slide.payload as {
    totalRefunds: number;
    refundRate: number;
    refundAmount: number;
    industryAverage: number;
    topReasons: RefundReason[];
  };

  const isBetterThanAverage = refundRate < industryAverage;

  return (
    <div className="relative flex h-full w-full flex-col justify-start px-12 py-8">
      <motion.div
        className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_30%,rgba(34,197,94,0.5),transparent_55%)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 1 }}
      />

      <div className="relative z-10 flex h-full flex-col gap-6">
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

        <div className="flex-1 flex items-center justify-center gap-12">
          {/* Main refund rate gauge */}
          <motion.div
            className="relative w-48 h-48"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <svg viewBox="0 0 200 200" className="w-full h-full">
              {/* Background arc */}
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="16"
                strokeDasharray="377 126"
                strokeLinecap="round"
                transform="rotate(135 100 100)"
              />
              {/* Progress arc */}
              <motion.circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke={isBetterThanAverage ? "#22c55e" : "#ef4444"}
                strokeWidth="16"
                strokeDasharray={`${(refundRate / 15) * 377} 503`}
                strokeLinecap="round"
                transform="rotate(135 100 100)"
                initial={{ strokeDasharray: "0 503" }}
                animate={{ strokeDasharray: `${(refundRate / 15) * 377} 503` }}
                transition={{ duration: 1, delay: 0.4 }}
              />
              {/* Industry average marker */}
              <circle
                cx={100 + 80 * Math.cos((135 + (industryAverage / 15) * 270) * Math.PI / 180)}
                cy={100 + 80 * Math.sin((135 + (industryAverage / 15) * 270) * Math.PI / 180)}
                r="6"
                fill="#fbbf24"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                className={`text-5xl font-bold ${isBetterThanAverage ? "text-emerald-400" : "text-red-400"}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                {refundRate}%
              </motion.span>
              <span className="text-xs text-slate-400">refund rate</span>
            </div>
          </motion.div>

          {/* Stats and reasons */}
          <div className="flex flex-col gap-4">
            <motion.div
              className="flex gap-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="text-center">
                <div className="text-xl font-bold text-white">{totalRefunds.toLocaleString()}</div>
                <div className="text-xs text-slate-400">Total Refunds</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-white">${(refundAmount / 1000).toFixed(0)}K</div>
                <div className="text-xs text-slate-400">Refund Amount</div>
              </div>
            </motion.div>

            <motion.div
              className={`px-3 py-1.5 rounded-full text-sm font-medium ${isBetterThanAverage ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              {isBetterThanAverage ? "✓" : "!"} Industry avg: {industryAverage}%
            </motion.div>

            {/* Top reasons */}
            <motion.div
              className="mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <div className="text-xs text-slate-500 mb-2">Top refund reasons:</div>
              {topReasons.slice(0, 3).map((r, i) => (
                <div key={r.reason} className="flex items-center gap-2 text-xs mb-1">
                  <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-slate-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${r.percent}%` }}
                      transition={{ delay: 1 + i * 0.1 }}
                    />
                  </div>
                  <span className="text-slate-400">{r.reason}</span>
                  <span className="text-slate-500">{r.percent}%</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
