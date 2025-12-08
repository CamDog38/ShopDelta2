"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";

export function TopCustomerSlide({ slide }: { slide: Slide }) {
  const { orderCount, totalSpent, memberSince, favoriteCategory } = slide.payload as {
    orderCount: number;
    totalSpent: number;
    memberSince: string;
    favoriteCategory: string;
  };

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-12">
      <motion.div
        className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_30%,rgba(251,191,36,0.5),transparent_55%),radial-gradient(circle_at_50%_70%,rgba(249,115,22,0.4),transparent_55%)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 1 }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8">
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

        {/* Trophy/Crown icon */}
        <motion.div
          className="relative"
          initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.7, delay: 0.2, type: "spring" }}
        >
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.4)]">
            <svg
              className="w-12 h-12 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </div>
          <motion.div
            className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8, type: "spring" }}
          >
            #1
          </motion.div>
        </motion.div>

        {/* Big order count */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="text-6xl font-bold text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.4)]">
            {orderCount}
          </div>
          <div className="text-sm text-slate-300">orders this year</div>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          className="grid grid-cols-3 gap-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              ${totalSpent.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400">Total Spent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{memberSince}</div>
            <div className="text-xs text-slate-400">Member Since</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{favoriteCategory}</div>
            <div className="text-xs text-slate-400">Favorite Category</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
