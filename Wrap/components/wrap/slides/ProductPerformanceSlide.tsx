"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";

type Product = { name: string; revenue: number; growth: number; category: string };

export function ProductPerformanceSlide({ slide }: { slide: Slide }) {
  const { products } = slide.payload as { products: Product[] };

  // Build treemap layout
  const totalRevenue = products.reduce((s, p) => s + p.revenue, 0);
  
  // Simple grid-based treemap approximation
  const sortedProducts = [...products].sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="relative flex h-full w-full flex-col justify-start px-10 py-6">
      <motion.div
        className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_0%_100%,rgba(59,130,246,0.4),transparent_50%)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
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
            <p className="mt-1 text-xs text-slate-100/85">{slide.subtitle}</p>
          )}
        </motion.div>

        <motion.div
          className="flex-1 grid grid-cols-4 grid-rows-3 gap-1 rounded-xl overflow-hidden"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {sortedProducts.map((product, i) => {
            const isPositive = product.growth >= 0;
            const intensity = Math.min(Math.abs(product.growth) / 50, 1);
            const bgColor = isPositive
              ? `rgba(34, 197, 94, ${0.3 + intensity * 0.5})`
              : `rgba(239, 68, 68, ${0.3 + intensity * 0.5})`;

            // First 2 products span 2 columns
            const colSpan = i < 2 ? "col-span-2" : "col-span-1";
            const rowSpan = i < 2 ? "row-span-2" : "row-span-1";

            return (
              <motion.div
                key={product.name}
                className={`${colSpan} ${rowSpan} relative overflow-hidden rounded-lg p-2 flex flex-col justify-between`}
                style={{ backgroundColor: bgColor }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.05 }}
              >
                <div className="flex items-start justify-between">
                  <span className={`font-semibold ${i < 2 ? "text-sm" : "text-[10px]"} text-white truncate`}>
                    {product.name}
                  </span>
                  <span className={`${i < 2 ? "text-xs" : "text-[9px]"} font-bold ${isPositive ? "text-emerald-300" : "text-red-300"}`}>
                    {isPositive ? "+" : ""}{product.growth.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <div className={`${i < 2 ? "text-xs" : "text-[8px]"} text-white/70 truncate`}>
                    {product.category}
                  </div>
                  <div className={`${i < 2 ? "text-sm" : "text-[9px]"} font-semibold text-white/90`}>
                    ${(product.revenue / 1000).toFixed(0)}K
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          className="flex justify-center gap-6 text-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-500/60" />
            <span className="text-slate-400">Growth</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500/60" />
            <span className="text-slate-400">Decline</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
