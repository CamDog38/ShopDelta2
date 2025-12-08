"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";

export function CartRecoverySlide({ slide }: { slide: Slide }) {
  const { abandonedCarts, recoveredCarts, recoveredRevenue, recoveryRate } = slide.payload as {
    abandonedCarts: number;
    recoveredCarts: number;
    recoveredRevenue: number;
    recoveryRate: number;
  };

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-12">
      <motion.div
        className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.5),transparent_60%)]"
        initial={{ opacity: 0, scale: 1.2 }}
        animate={{ opacity: 0.4, scale: 1 }}
        transition={{ duration: 1.2 }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-2xl font-semibold tracking-tight">{slide.title}</h2>
        </motion.div>

        {/* Big recovered revenue number */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <div className="text-6xl font-bold text-emerald-400 drop-shadow-[0_0_30px_rgba(34,197,94,0.5)]">
            ${(recoveredRevenue / 1000).toFixed(0)}K
          </div>
          <div className="text-sm text-slate-300 mt-2">recovered from abandoned carts</div>
        </motion.div>

        {/* Stats row */}
        <motion.div
          className="flex gap-12 mt-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {(abandonedCarts / 1000).toFixed(0)}K
            </div>
            <div className="text-xs text-slate-400">Abandoned Carts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {(recoveredCarts / 1000).toFixed(1)}K
            </div>
            <div className="text-xs text-slate-400">Recovered</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">{recoveryRate}%</div>
            <div className="text-xs text-slate-400">Recovery Rate</div>
          </div>
        </motion.div>

        {/* Visual representation */}
        <motion.div
          className="w-80 h-3 bg-white/10 rounded-full overflow-hidden mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${recoveryRate}%` }}
            transition={{ duration: 1, delay: 0.8 }}
          />
        </motion.div>

        {slide.subtitle && (
          <motion.p
            className="text-sm text-slate-200/80 text-center max-w-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            {slide.subtitle}
          </motion.p>
        )}
      </div>
    </div>
  );
}
