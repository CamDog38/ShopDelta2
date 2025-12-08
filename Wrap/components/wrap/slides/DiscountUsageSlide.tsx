"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";

type DiscountCode = { code: string; uses: number; revenue: number };

export function DiscountUsageSlide({ slide }: { slide: Slide }) {
  const { totalDiscountedOrders, discountedOrdersPercent, totalDiscountAmount, topCodes } = slide.payload as {
    totalDiscountedOrders: number;
    discountedOrdersPercent: number;
    totalDiscountAmount: number;
    topCodes: DiscountCode[];
  };

  const maxUses = Math.max(...topCodes.map((c) => c.uses));

  return (
    <div className="relative flex h-full w-full flex-col justify-start px-12 py-8">
      <motion.div
        className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_50%,rgba(249,115,22,0.5),transparent_55%),radial-gradient(circle_at_80%_50%,rgba(234,179,8,0.4),transparent_55%)]"
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

        {/* Summary stats */}
        <motion.div
          className="flex justify-center gap-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-center px-6 py-3 rounded-xl bg-white/5">
            <div className="text-3xl font-bold text-orange-400">{discountedOrdersPercent}%</div>
            <div className="text-xs text-slate-400">orders used discounts</div>
          </div>
          <div className="text-center px-6 py-3 rounded-xl bg-white/5">
            <div className="text-3xl font-bold text-amber-400">${(totalDiscountAmount / 1000).toFixed(0)}K</div>
            <div className="text-xs text-slate-400">total discounts given</div>
          </div>
        </motion.div>

        {/* Top discount codes */}
        <div className="flex-1 flex flex-col justify-center gap-3">
          <motion.div
            className="text-sm text-slate-400 mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Top performing discount codes:
          </motion.div>

          {topCodes.map((code, i) => {
            const widthPercent = (code.uses / maxUses) * 100;

            return (
              <motion.div
                key={code.code}
                className="flex items-center gap-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
              >
                <div className="w-28">
                  <span className="font-mono text-sm font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                    {code.code}
                  </span>
                </div>
                <div className="flex-1 h-10 bg-white/5 rounded-lg overflow-hidden relative">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500/80 to-amber-500/80 rounded-lg"
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPercent}%` }}
                    transition={{ duration: 0.8, delay: 0.6 + i * 0.1 }}
                  />
                  <div className="relative z-10 h-full flex items-center justify-between px-3">
                    <span className="text-xs text-white font-medium">
                      {code.uses.toLocaleString()} uses
                    </span>
                  </div>
                </div>
                <div className="w-24 text-right">
                  <span className="text-sm font-semibold text-white">
                    ${(code.revenue / 1000).toFixed(0)}K
                  </span>
                  <span className="text-xs text-slate-500 block">revenue</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
