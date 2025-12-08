"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";

type MonthlyAov = { month: string; aov: number };

export function AovGrowthSlide({ slide }: { slide: Slide }) {
  const { startAov, endAov, growthPercent, monthlyAov, currencyCode, yearA, yearB } = slide.payload as {
    startAov: number;
    endAov: number;
    growthPercent: number;
    monthlyAov: MonthlyAov[];
    currencyCode?: string | null;
    yearA?: number;
    yearB?: number;
  };

  // Get currency symbol
  const getCurrencySymbol = (code: string) => {
    try {
      return new Intl.NumberFormat("en", { style: "currency", currency: code })
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value || code;
    } catch {
      return code;
    }
  };
  const currencySymbol = getCurrencySymbol(currencyCode || "USD");

  const minAov = Math.min(...monthlyAov.map((m) => m.aov));
  const maxAov = Math.max(...monthlyAov.map((m) => m.aov));
  // Handle case where all values are the same (range = 0)
  const range = maxAov - minAov || 1;

  // Build SVG path for the line chart
  const chartWidth = 700;
  const chartHeight = 180;
  const padding = 30;
  const usableHeight = chartHeight - padding * 2;

  const points = monthlyAov.map((m, i) => {
    const x = padding + (i / Math.max(monthlyAov.length - 1, 1)) * (chartWidth - padding * 2);
    // If range is 0 (all same values), center the line
    const normalizedY = range > 0 ? (m.aov - minAov) / range : 0.5;
    const y = chartHeight - padding - normalizedY * usableHeight;
    return { x, y: isNaN(y) ? chartHeight / 2 : y, ...m };
  });

  const pathD = points.reduce((acc, p, i) => {
    return acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
  }, "");

  const areaD = pathD + ` L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`;

  const isPositive = growthPercent >= 0;

  return (
    <div className="relative flex h-full w-full flex-col justify-start px-4 sm:px-10 py-4 sm:py-8">
      <motion.div
        className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_80%_80%,rgba(16,185,129,0.5),transparent_55%)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 1 }}
      />

      <div className="relative z-10 flex h-full flex-col gap-2 sm:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">{slide.title}</h2>
          {slide.subtitle && (
            <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-slate-200/80">{slide.subtitle}</p>
          )}
        </motion.div>

        {/* Big numbers */}
        <motion.div
          className="flex items-center justify-center gap-3 sm:gap-8 flex-wrap"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-center">
            <div className="text-2xl sm:text-4xl font-bold text-slate-400">{currencySymbol}{startAov}</div>
            <div className="text-[10px] sm:text-xs text-slate-500">{yearA || 2024} AOV</div>
          </div>
          <motion.div
            className={`text-xl sm:text-2xl ${isPositive ? "text-emerald-400" : "text-rose-400"}`}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
          >
            →
          </motion.div>
          <div className="text-center">
            <div className={`text-2xl sm:text-4xl font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>{currencySymbol}{endAov}</div>
            <div className="text-[10px] sm:text-xs text-slate-500">{yearB || 2025} AOV</div>
          </div>
          <motion.div
            className={`ml-2 sm:ml-4 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full ${isPositive ? "bg-emerald-500/20 border border-emerald-500/30" : "bg-rose-500/20 border border-rose-500/30"}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
          >
            <span className={`text-sm sm:text-base font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>{isPositive ? "+" : ""}{growthPercent}%</span>
          </motion.div>
        </motion.div>

        {/* Line chart */}
        <div className="flex-1 flex items-center justify-center min-h-0">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full max-w-2xl h-32 sm:h-48">
            {/* Grid lines */}
            {[0, 1, 2, 3, 4].map((i) => (
              <line
                key={i}
                x1={padding}
                y1={padding + (i * (chartHeight - padding * 2)) / 4}
                x2={chartWidth - padding}
                y2={padding + (i * (chartHeight - padding * 2)) / 4}
                stroke="rgba(255,255,255,0.1)"
                strokeDasharray="4 4"
              />
            ))}

            {/* Area fill */}
            <motion.path
              d={areaD}
              fill="url(#aovGradient)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              transition={{ duration: 1, delay: 0.5 }}
            />

            {/* Line */}
            <motion.path
              d={pathD}
              fill="none"
              stroke="url(#aovLineGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, delay: 0.3 }}
            />

            {/* Data points */}
            {points.map((p, i) => (
              <motion.circle
                key={p.month}
                cx={p.x}
                cy={p.y}
                r="4"
                fill="#10b981"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.08 }}
              />
            ))}

            {/* Month labels */}
            {points.map((p) => (
              <text
                key={`label-${p.month}`}
                x={p.x}
                y={chartHeight - 4}
                textAnchor="middle"
                fill="rgba(255,255,255,0.5)"
                fontSize="10"
              >
                {p.month}
              </text>
            ))}

            <defs>
              <linearGradient id="aovGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="aovLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6ee7b7" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  );
}
