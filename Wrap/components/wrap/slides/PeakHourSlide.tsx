"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";

type HourData = { hour: number; sales: number };

export function PeakHourSlide({ slide }: { slide: Slide }) {
  const { hour, hourLabel, hourlyBreakdown } = slide.payload as {
    hour: number;
    hourLabel: string;
    hourlyBreakdown: HourData[];
  };

  const maxSales = Math.max(...hourlyBreakdown.map((h) => h.sales));

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-12">
      <motion.div
        className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_50%,rgba(251,191,36,0.5),transparent_60%)]"
        initial={{ opacity: 0, scale: 1.2 }}
        animate={{ opacity: 0.4, scale: 1 }}
        transition={{ duration: 1.2 }}
      />

      <motion.div
        className="relative z-10 flex flex-col items-center gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <h2 className="text-2xl font-semibold tracking-tight">{slide.title}</h2>

        {/* Clock visualization */}
        <div className="relative w-64 h-64">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {/* Clock face */}
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="2"
            />

            {/* Hour markers and bars */}
            {hourlyBreakdown.map((h, i) => {
              const angle = (i * 15 - 90) * (Math.PI / 180);
              const intensity = h.sales / maxSales;
              const innerR = 40;
              const outerR = 40 + intensity * 45;

              const x1 = 100 + Math.cos(angle) * innerR;
              const y1 = 100 + Math.sin(angle) * innerR;
              const x2 = 100 + Math.cos(angle) * outerR;
              const y2 = 100 + Math.sin(angle) * outerR;

              const isPeak = h.hour === hour;

              return (
                <motion.line
                  key={h.hour}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isPeak ? "#fbbf24" : "rgba(255,255,255,0.4)"}
                  strokeWidth={isPeak ? 6 : 4}
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: i * 0.03 }}
                />
              );
            })}

            {/* Hour labels */}
            {[12, 3, 6, 9].map((h) => {
              const angle = ((h === 12 ? 0 : h) * 30 - 90) * (Math.PI / 180);
              const x = 100 + Math.cos(angle) * 78;
              const y = 100 + Math.sin(angle) * 78;
              const label = h === 12 ? "12" : h === 3 ? "3" : h === 6 ? "6" : "9";
              return (
                <text
                  key={h}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="rgba(255,255,255,0.5)"
                  fontSize="10"
                >
                  {label}
                </text>
              );
            })}

            {/* Center text */}
            <text
              x="100"
              y="95"
              textAnchor="middle"
              fill="white"
              fontSize="24"
              fontWeight="bold"
            >
              {hourLabel}
            </text>
            <text
              x="100"
              y="115"
              textAnchor="middle"
              fill="rgba(255,255,255,0.7)"
              fontSize="10"
            >
              Peak Hour
            </text>
          </svg>
        </div>

        {slide.subtitle && (
          <p className="text-sm text-slate-200/80 text-center max-w-md">
            {slide.subtitle}
          </p>
        )}
      </motion.div>
    </div>
  );
}
