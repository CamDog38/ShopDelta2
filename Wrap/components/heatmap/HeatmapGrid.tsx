"use client";

import { motion } from "framer-motion";
import type { HeatmapTile } from "../../lib/heatmap";

type Props = {
  tiles: HeatmapTile[];
};

export function HeatmapGrid({ tiles }: Props) {
  return (
    <main className="min-h-screen bg-slate-950 px-8 py-6 text-white">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            E-commerce Performance Heatmap
          </h1>
          <p className="text-xs text-slate-400">
            Tile size reflects revenue; color reflects daily revenue change.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-300">
          <span className="inline-flex h-3 w-8 rounded-sm bg-[linear-gradient(to_right,#b91c1c,#22c55e)]" />
          <span>Red = declining, Green = growing</span>
        </div>
      </div>

      <div
        className="grid gap-[2px] rounded-xl border border-slate-800 bg-slate-900/80 p-[3px] shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
        style={{
          gridTemplateColumns: "repeat(24, minmax(0, 1fr))",
          gridAutoRows: "26px",
        }}
      >
        {tiles.map((tile) => (
          <motion.div
            key={tile.id}
            className="relative overflow-hidden rounded-[3px] border border-black/40 text-[10px] leading-snug"
            style={{
              gridColumnEnd: `span ${tile.colSpan}`,
              gridRowEnd: `span ${tile.rowSpan}`,
              backgroundColor: tile.color,
            }}
            whileHover={{ scale: 1.03 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-black/35 via-transparent to-black/60" />
            <div className="relative z-10 flex h-full flex-col justify-between p-1.5">
              <div className="flex items-baseline justify-between gap-1">
                <span className="truncate text-[11px] font-semibold">
                  {tile.label}
                </span>
                <span
                  className="text-[10px] font-semibold"
                  aria-label={`${tile.changePct.toFixed(2)} percent`}
                >
                  {tile.changePct > 0 ? "+" : ""}
                  {tile.changePct.toFixed(2)}%
                </span>
              </div>
              <div className="truncate text-[9px] text-slate-100/85">
                {tile.name}
              </div>
              <div className="mt-0.5 flex items-baseline justify-between text-[8px] text-slate-200/75">
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
    </main>
  );
}
