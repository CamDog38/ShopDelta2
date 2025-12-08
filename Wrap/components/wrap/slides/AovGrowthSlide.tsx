"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";

type MonthlyAov = { month: string; aov: number };

export function AovGrowthSlide({ slide }: { slide: Slide }) {
  const { startAov, endAov, growthPercent, monthlyAov } = slide.payload as {
    startAov: number;
    endAov: number;
    growthPercent: number;
    monthlyAov: MonthlyAov[];
  };

  const minAov = Math.min(...monthlyAov.map((m) => m.aov));
  const maxAov = Math.max(...monthlyAov.map((m) => m.aov));
  const range = maxAov - minAov;

  // Build SVG path for the line chart
  const chartWidth = 700;
  const chartHeight = 180;
  const padding = 20;

  const points = monthlyAov.map((m, i) => {
    const x = padding + (i / (monthlyAov.length - 1)) * (chartWidth - padding * 2);
    const y = chartHeight - padding - ((m.aov - minAov) / range) * (chartHeight - padding * 2);
    return { x, y, ...m };
  });

  const pathD = points.reduce((acc, p, i) => {
    return acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
  }, "");

  const areaD = pathD + ` L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`;

  return (
    <div className="relative flex h-full w-full flex-col justify-start px-10 py-8">
      <motion.div
        className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_80%_80%,rgba(16,185,129,0.5),transparent_55%)]"
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

        {/* Big numbers */}
        <motion.div
          className="flex items-center justify-center gap-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-center">
            <div className="text-4xl font-bold text-slate-400">${startAov}</div>
            <div className="text-xs text-slate-500">Jan AOV</div>
          </div>
          <motion.div
            className="text-2xl text-emerald-400"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
          >
            →
          </motion.div>
          <div className="text-center">
            <div className="text-4xl font-bold text-emerald-400">${endAov}</div>
            <div className="text-xs text-slate-500">Dec AOV</div>
          </div>
          <motion.div
            className="ml-4 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
          >
            <span className="text-emerald-400 font-bold">+{growthPercent}%</span>
          </motion.div>
        </motion.div>

        {/* Line chart */}
        <div className="flex-1 flex items-center justify-center">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full max-w-2xl h-48">
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
