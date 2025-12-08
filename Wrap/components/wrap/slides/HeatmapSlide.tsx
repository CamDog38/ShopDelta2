"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";
import type { HeatmapTile } from "../../../lib/heatmap";

export function HeatmapSlide({ slide }: { slide: Slide }) {
  const tiles = (slide.payload?.tiles || []) as HeatmapTile[];

  return (
    <div className="relative flex h-full w-full flex-col justify-start px-10 py-6">
      <motion.div
        className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_0%_0%,rgba(56,189,248,0.45),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(34,197,94,0.45),transparent_55%)]"
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 0.4, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />

      <div className="relative z-10 flex h-full flex-col gap-4">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.8, 0.25, 1] }}
        >
          <h2 className="text-2xl font-semibold tracking-tight">
            {slide.title}
          </h2>
          {slide.subtitle && (
            <p className="mt-1 text-xs text-slate-100/85 max-w-xl">
              {slide.subtitle}
            </p>
          )}
        </motion.div>

        <motion.div
          className="mt-2 flex-1 rounded-xl border border-white/10 bg-slate-950/60 shadow-[0_18px_48px_rgba(0,0,0,0.8)] overflow-hidden"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="relative h-full w-full">
            {tiles.map((tile) => (
              <motion.div
                key={tile.id}
                className="absolute overflow-hidden text-[9px] leading-snug"
                style={{
                  left: `${tile.x}%`,
                  top: `${tile.y}%`,
                  width: `${tile.width}%`,
                  height: `${tile.height}%`,
                  backgroundColor: tile.color,
                }}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-black/35 via-transparent to-black/60" />
                <div className="relative z-10 flex h-full flex-col justify-between p-1.5">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="truncate text-[10px] font-semibold">
                      {tile.label}
                    </span>
                    <span className="text-[9px] font-semibold">
                      {tile.changePct > 0 ? "+" : ""}
                      {tile.changePct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="truncate text-[8px] text-slate-100/85">
                    {tile.name}
                  </div>
                  <div className="mt-0.5 flex items-baseline justify-between text-[7px] text-slate-200/75">
                    <span className="truncate">{tile.sector}</span>
                    <span className="opacity-80">
                      Rev: $
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
