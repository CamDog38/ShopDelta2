"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";

export function FastestSellingSlide({ slide }: { slide: Slide }) {
  const { productName, soldOutTime, unitsSold, launchDate } = slide.payload as {
    productName: string;
    soldOutTime: string; // This is actually the growth percentage
    unitsSold: number;
    launchDate: string;
  };

  // soldOutTime is actually the growth percentage like "+489%"
  const growthPercent = soldOutTime;

  return (
    <div className="relative flex min-h-full w-full flex-col items-center justify-center px-4 sm:px-12 py-8 sm:py-0 sm:h-full">
      <motion.div
        className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_50%,rgba(239,68,68,0.5),transparent_55%),radial-gradient(circle_at_70%_50%,rgba(249,115,22,0.4),transparent_55%)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 1 }}
      />

      <div className="relative z-10 flex flex-col items-center gap-3 sm:gap-8">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">{slide.title}</h2>
        </motion.div>

        {/* Lightning bolt icon */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: "spring" }}
        >
          <svg
            className="w-10 h-10 sm:w-16 sm:h-16 text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" />
          </svg>
        </motion.div>

        {/* Product name */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-xl sm:text-3xl font-bold text-white">{productName}</div>
        </motion.div>

        {/* Growth percentage - big emphasis */}
        <motion.div
          className="text-center px-4 sm:px-8 py-2 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
        >
          <div className="text-xs sm:text-sm text-slate-300 mb-0.5 sm:mb-1">Sales Growth</div>
          <div className="text-3xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
            {growthPercent}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="flex gap-6 sm:gap-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div className="text-center">
            <div className="text-lg sm:text-2xl font-bold text-white">
              {unitsSold.toLocaleString()}
            </div>
            <div className="text-[10px] sm:text-xs text-slate-400">Units Sold</div>
          </div>
          <div className="text-center">
            <div className="text-lg sm:text-2xl font-bold text-white">{launchDate}</div>
            <div className="text-[10px] sm:text-xs text-slate-400">Launch Date</div>
          </div>
        </motion.div>

        {slide.subtitle && (
          <motion.p
            className="text-xs sm:text-sm text-slate-200/80 text-center max-w-md"
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
