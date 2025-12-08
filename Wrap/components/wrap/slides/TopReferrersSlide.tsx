"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";

type Referrer = { source: string; visitors: number; revenue: number; conversionRate: number; icon: string };

export function TopReferrersSlide({ slide }: { slide: Slide }) {
  const { referrers } = slide.payload as { referrers: Referrer[] };

  const maxRevenue = Math.max(...referrers.map((r) => r.revenue));

  return (
    <div className="relative flex h-full w-full flex-col justify-start px-12 py-8">
      <motion.div
        className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_80%_20%,rgba(236,72,153,0.5),transparent_55%),radial-gradient(circle_at_20%_80%,rgba(59,130,246,0.4),transparent_55%)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 1 }}
      />

      <div className="relative z-10 flex h-full flex-col gap-4">
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

        <div className="flex-1 flex flex-col justify-center gap-3">
          {referrers.map((ref, i) => {
            const widthPercent = (ref.revenue / maxRevenue) * 100;

            return (
              <motion.div
                key={ref.source}
                className="flex items-center gap-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">
                  {ref.icon}
                </div>

                {/* Source name */}
                <div className="w-32">
                  <div className="text-sm font-medium text-white truncate">{ref.source}</div>
                  <div className="text-xs text-slate-500">
                    {(ref.visitors / 1000).toFixed(0)}K visitors
                  </div>
                </div>

                {/* Revenue bar */}
                <div className="flex-1 h-8 bg-white/5 rounded-lg overflow-hidden relative">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-pink-500/80 to-blue-500/80 rounded-lg"
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPercent}%` }}
                    transition={{ duration: 0.8, delay: 0.4 + i * 0.1 }}
                  />
                  <div className="relative z-10 h-full flex items-center px-3">
                    <span className="text-xs font-semibold text-white">
                      ${(ref.revenue / 1000).toFixed(0)}K
                    </span>
                  </div>
                </div>

                {/* Conversion rate */}
                <div className="w-16 text-right">
                  <div className="text-sm font-bold text-emerald-400">{ref.conversionRate}%</div>
                  <div className="text-[10px] text-slate-500">CVR</div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="text-center text-xs text-slate-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          Email has the highest conversion rate at{" "}
          <span className="text-emerald-400 font-bold">
            {Math.max(...referrers.map((r) => r.conversionRate))}%
          </span>
        </motion.div>
      </div>
    </div>
  );
}
