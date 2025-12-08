"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";

type Product = { name: string; sku: string; revenue: number; units: number; image: string };

export function TopProductsSlide({ slide }: { slide: Slide }) {
  const { products, currencyCode } = slide.payload as {
    products: Product[];
    currencyCode?: string | null;
  };

  const currency = currencyCode || "USD";
  const fmtMoney = (n: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="relative flex min-h-full w-full flex-col justify-start px-4 sm:px-12 py-8 sm:h-full">
      <motion.div
        className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.5),transparent_55%)]"
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

        <div className="flex-1 flex flex-col justify-center gap-3">
          {products.map((product, i) => (
            <motion.div
              key={product.sku}
              className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/10"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              {/* Rank */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                i === 0 ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white" :
                i === 1 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-slate-800" :
                i === 2 ? "bg-gradient-to-br from-amber-600 to-amber-700 text-white" :
                "bg-white/10 text-slate-400"
              }`}>
                {i + 1}
              </div>

              {/* Product info */}
              <div className="flex-1">
                <div className="font-semibold text-white">{product.name}</div>
                <div className="text-xs text-slate-500">{product.sku}</div>
              </div>

              {/* Stats */}
              <div className="text-right">
                <div className="font-bold text-lg text-purple-400">
                  {fmtMoney(product.revenue)}
                </div>
                <div className="text-xs text-slate-400">
                  {product.units.toLocaleString()} units
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
