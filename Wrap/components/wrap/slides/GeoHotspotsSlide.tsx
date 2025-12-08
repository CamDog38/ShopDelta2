"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";

type Region = { name: string; sales: number; orders: number };

export function GeoHotspotsSlide({ slide }: { slide: Slide }) {
  const { topRegion, topRegionSales, regions } = slide.payload as {
    topRegion: string;
    topRegionSales: number;
    regions: Region[];
  };

  const maxSales = Math.max(...regions.map((r) => r.sales));

  return (
    <div className="relative flex h-full w-full flex-col justify-start px-12 py-8">
      <motion.div
        className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_80%,rgba(59,130,246,0.5),transparent_55%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.4),transparent_55%)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 1 }}
      />

      <div className="relative z-10 flex h-full flex-col gap-6">
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

        <div className="flex-1 flex flex-col justify-center gap-3">
          {regions.map((region, i) => {
            const widthPercent = (region.sales / maxSales) * 100;
            const isTop = region.name === topRegion;

            return (
              <motion.div
                key={region.name}
                className="flex items-center gap-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="w-24 text-right">
                  <span className={`text-sm font-medium ${isTop ? "text-emerald-400" : "text-white"}`}>
                    {region.name}
                  </span>
                </div>
                <div className="flex-1 h-8 bg-white/10 rounded-lg overflow-hidden">
                  <motion.div
                    className={`h-full rounded-lg ${isTop ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : "bg-gradient-to-r from-blue-500/80 to-blue-400/80"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPercent}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                  />
                </div>
                <div className="w-28 text-right">
                  <span className="text-sm font-semibold text-white">
                    ${(region.sales / 1000).toFixed(0)}K
                  </span>
                  <span className="text-xs text-slate-400 ml-2">
                    {region.orders.toLocaleString()} orders
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <span className="text-xs text-slate-400">
            Top market: <span className="text-emerald-400 font-semibold">{topRegion}</span> with ${(topRegionSales / 1000000).toFixed(2)}M in sales
          </span>
        </motion.div>
      </div>
    </div>
  );
}
