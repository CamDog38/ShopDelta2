"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";

type DayPoint = { day: number; salesCurr: number; salesPrev: number };

type Payload = {
  periodLabel: string;
  compareLabel: string;
  dailySales: DayPoint[];
  currencyCode?: string | null;
};

function getCurrencySymbol(code: string) {
  try {
    return (
      new Intl.NumberFormat("en", { style: "currency", currency: code })
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value || code
    );
  } catch {
    return code;
  }
}

function formatCompactCurrency(value: number, currencySymbol: string) {
  if (!isFinite(value)) return `${currencySymbol}0`;
  if (value >= 1000000) return `${currencySymbol}${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${currencySymbol}${(value / 1000).toFixed(0)}K`;
  return `${currencySymbol}${value.toFixed(0)}`;
}

function buildPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return "";
  return points.reduce((d, p, i) => d + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`), "");
}

export function DailySalesCompareSlide({ slide }: { slide: Slide }) {
  const { periodLabel, compareLabel, dailySales, currencyCode } = slide.payload as Payload;

  const symbol = getCurrencySymbol(currencyCode || "USD");

  const maxY = Math.max(
    ...dailySales.map((d) => Math.max(d.salesCurr, d.salesPrev)),
    1,
  );

  const best = dailySales.reduce((m, d) => (d.salesCurr > m.salesCurr ? d : m), dailySales[0]);
  const worst = dailySales.reduce((m, d) => (d.salesCurr < m.salesCurr ? d : m), dailySales[0]);

  const chartWidth = 780;
  const chartHeight = 220;
  const paddingX = 36;
  const paddingY = 24;
  const usableW = chartWidth - paddingX * 2;
  const usableH = chartHeight - paddingY * 2;

  const toPoint = (idx: number, value: number) => {
    const x = paddingX + (idx / Math.max(dailySales.length - 1, 1)) * usableW;
    const y = chartHeight - paddingY - (value / maxY) * usableH;
    return { x, y };
  };

  const currPts = dailySales.map((d, i) => ({ ...toPoint(i, d.salesCurr), day: d.day, value: d.salesCurr }));
  const prevPts = dailySales.map((d, i) => ({ ...toPoint(i, d.salesPrev), day: d.day, value: d.salesPrev }));

  const currPath = buildPath(currPts);
  const prevPath = buildPath(prevPts);

  return (
    <div className="relative flex min-h-full w-full flex-col justify-start px-4 sm:px-12 py-8 sm:py-8 sm:h-full">
      <motion.div
        className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.35),transparent_55%),radial-gradient(circle_at_0%_100%,rgba(167,139,250,0.35),transparent_55%)]"
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 0.4, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />

      <div className="relative z-10 flex h-full flex-col gap-4 sm:gap-6">
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

        <div className="rounded-2xl bg-black/30 border border-white/10 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-4 text-xs text-white/70">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-400" />
                {periodLabel}
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-400" />
                {compareLabel}
              </div>
            </div>

            <div className="text-xs text-white/70">
              Best day: <span className="font-semibold text-white">{periodLabel} Day {best.day}</span> ({formatCompactCurrency(best.salesCurr, symbol)})
              <span className="mx-2 text-white/30">|</span>
              Worst day: <span className="font-semibold text-white">Day {worst.day}</span> ({formatCompactCurrency(worst.salesCurr, symbol)})
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex items-center justify-center">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full max-w-3xl h-44 sm:h-56">
            {[0, 1, 2, 3].map((i) => (
              <line
                key={i}
                x1={paddingX}
                y1={paddingY + (i * usableH) / 3}
                x2={chartWidth - paddingX}
                y2={paddingY + (i * usableH) / 3}
                stroke="rgba(255,255,255,0.10)"
                strokeDasharray="4 4"
              />
            ))}

            <motion.path
              d={prevPath}
              fill="none"
              stroke="rgba(148,163,184,0.95)"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, delay: 0.15 }}
            />

            <motion.path
              d={currPath}
              fill="none"
              stroke="url(#currLine)"
              strokeWidth="3.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, delay: 0.05 }}
            />

            {currPts.map((p, i) => (
              <motion.circle
                key={`c-${p.day}`}
                cx={p.x}
                cy={p.y}
                r={i === best.day - 1 ? 5 : 3.5}
                fill={i === best.day - 1 ? "#38bdf8" : "#a5f3fc"}
                opacity={i === best.day - 1 ? 1 : 0.75}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: i === best.day - 1 ? 1 : 0.75, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.01 }}
              />
            ))}

            {prevPts.map((p, i) => (
              <motion.circle
                key={`p-${p.day}`}
                cx={p.x}
                cy={p.y}
                r={3}
                fill="#94a3b8"
                opacity={0.6}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 0.6, scale: 1 }}
                transition={{ delay: 0.35 + i * 0.01 }}
              />
            ))}

            {dailySales.map((d, i) => {
              const show = d.day === 1 || d.day === dailySales.length || d.day % 7 === 0;
              if (!show) return null;
              const x = paddingX + (i / Math.max(dailySales.length - 1, 1)) * usableW;
              return (
                <text
                  key={`x-${d.day}`}
                  x={x}
                  y={chartHeight - 6}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.45)"
                  fontSize="10"
                >
                  {d.day}
                </text>
              );
            })}

            <defs>
              <linearGradient id="currLine" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  );
}
