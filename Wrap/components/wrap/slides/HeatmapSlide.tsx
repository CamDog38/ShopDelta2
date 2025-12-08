"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";
import type { HeatmapTile } from "../../../lib/heatmap";

export function HeatmapSlide({ slide }: { slide: Slide }) {
  const tiles = (slide.payload?.tiles || []) as HeatmapTile[];
  const currencyCode = (slide.payload?.currencyCode as string) || "USD";

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
  const currencySymbol = getCurrencySymbol(currencyCode);

  return (
    <div className="relative flex min-h-full w-full flex-col justify-start px-4 sm:px-8 py-8 sm:py-6 sm:h-full">
      <motion.div
        className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_0%_0%,rgba(56,189,248,0.45),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(34,197,94,0.45),transparent_55%)]"
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 0.4, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />

      <div className="relative z-10 flex h-full flex-col gap-3">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.8, 0.25, 1] }}
        >
          <h2 className="text-2xl font-semibold tracking-tight">
            {slide.title}
          </h2>
          {slide.subtitle && (
            <p className="mt-1 text-sm text-slate-100/85 max-w-xl">
              {slide.subtitle}
            </p>
          )}
        </motion.div>

        <motion.div
          className="flex-1 rounded-xl border border-white/10 bg-slate-950/60 shadow-[0_18px_48px_rgba(0,0,0,0.8)] overflow-hidden"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="relative h-full w-full p-1">
            {tiles.map((tile, idx) => (
              <motion.div
                key={tile.id}
                className="absolute overflow-hidden rounded-md"
                style={{
                  left: `calc(${tile.x}% + 2px)`,
                  top: `calc(${tile.y}% + 2px)`,
                  width: `calc(${tile.width}% - 4px)`,
                  height: `calc(${tile.height}% - 4px)`,
                  backgroundColor: tile.color,
                }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: idx * 0.03 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/40" />
                <div className="relative z-10 flex h-full flex-col justify-between p-2.5">
                  <div className="flex items-start justify-between gap-1">
                    <span className="truncate text-[13px] font-bold text-white drop-shadow-sm">
                      {tile.label}
                    </span>
                    <span 
                      className={`text-[12px] font-bold px-1.5 py-0.5 rounded ${
                        tile.changePct > 0 
                          ? "bg-emerald-500/30 text-emerald-200" 
                          : tile.changePct < 0 
                          ? "bg-red-500/30 text-red-200"
                          : "bg-slate-500/30 text-slate-200"
                      }`}
                    >
                      {tile.changePct > 0 ? "+" : ""}
                      {tile.changePct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="truncate text-[11px] text-white/90 font-medium">
                    {tile.name}
                  </div>
                  <div className="flex items-baseline justify-between text-[10px]">
                    <span className="truncate text-white/70">{tile.sector}</span>
                    <span className="font-semibold text-white/90">
                      Rev: {currencySymbol}
                      {Intl.NumberFormat("en", {
                        notation: "compact",
                        maximumFractionDigits: 1,
                      }).format(tile.value)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
