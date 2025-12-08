"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";

export function CustomerLoyaltySlide({ slide }: { slide: Slide }) {
  const { newCustomers, returningCustomers, newRevenue, returningRevenue, returningRevenuePercent } = slide.payload as {
    newCustomers: number;
    returningCustomers: number;
    newRevenue: number;
    returningRevenue: number;
    returningRevenuePercent: number;
  };

  const totalCustomers = newCustomers + returningCustomers;
  const returningPercent = (returningCustomers / totalCustomers) * 100;
  const newPercent = 100 - returningPercent;

  // Donut chart calculations
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const returningDash = (returningPercent / 100) * circumference;
  const newDash = (newPercent / 100) * circumference;

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-12">
      <motion.div
        className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_70%,rgba(236,72,153,0.5),transparent_55%),radial-gradient(circle_at_70%_30%,rgba(34,211,238,0.4),transparent_55%)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 1 }}
      />

      <div className="relative z-10 flex flex-col items-center gap-6">
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

        <div className="flex items-center gap-12">
          {/* Donut Chart */}
          <div className="relative w-48 h-48">
            <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
              {/* Background circle */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="24"
              />
              {/* Returning customers arc */}
              <motion.circle
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke="url(#returningGradient)"
                strokeWidth="24"
                strokeLinecap="round"
                strokeDasharray={`${returningDash} ${circumference}`}
                initial={{ strokeDasharray: `0 ${circumference}` }}
                animate={{ strokeDasharray: `${returningDash} ${circumference}` }}
                transition={{ duration: 1, delay: 0.3 }}
              />
              {/* New customers arc */}
              <motion.circle
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke="url(#newGradient)"
                strokeWidth="24"
                strokeLinecap="round"
                strokeDasharray={`${newDash} ${circumference}`}
                strokeDashoffset={-returningDash}
                initial={{ strokeDasharray: `0 ${circumference}` }}
                animate={{ strokeDasharray: `${newDash} ${circumference}` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
              <defs>
                <linearGradient id="returningGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#f472b6" />
                </linearGradient>
                <linearGradient id="newGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#67e8f9" />
                </linearGradient>
              </defs>
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                className="text-3xl font-bold text-white"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 }}
              >
                {returningRevenuePercent}%
              </motion.span>
              <span className="text-xs text-slate-300">returning revenue</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-4">
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-pink-500 to-pink-400" />
              <div>
                <div className="text-sm font-semibold text-white">
                  {returningCustomers.toLocaleString()} Returning
                </div>
                <div className="text-xs text-slate-400">
                  ${(returningRevenue / 1000000).toFixed(2)}M revenue
                </div>
              </div>
            </motion.div>
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
            >
              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-300" />
              <div>
                <div className="text-sm font-semibold text-white">
                  {newCustomers.toLocaleString()} New
                </div>
                <div className="text-xs text-slate-400">
                  ${(newRevenue / 1000000).toFixed(2)}M revenue
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
