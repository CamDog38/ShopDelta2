"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";

export function FunnelSlide({ slide }: { slide: Slide }) {
  const { visitors, productViews, addedToCart, checkout, purchased } = slide.payload as {
    visitors: number;
    productViews: number;
    addedToCart: number;
    checkout: number;
    purchased: number;
  };

  const stages = [
    { label: "Visitors", value: visitors, color: "from-indigo-500 to-indigo-400" },
    { label: "Product Views", value: productViews, color: "from-violet-500 to-violet-400" },
    { label: "Added to Cart", value: addedToCart, color: "from-purple-500 to-purple-400" },
    { label: "Checkout", value: checkout, color: "from-fuchsia-500 to-fuchsia-400" },
    { label: "Purchased", value: purchased, color: "from-pink-500 to-pink-400" },
  ];

  const maxValue = visitors;

  return (
    <div className="relative flex h-full w-full flex-col justify-start px-12 py-8">
      <motion.div
        className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.5),transparent_60%)]"
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

        <div className="flex-1 flex flex-col items-center justify-center gap-1">
          {stages.map((stage, i) => {
            const widthPercent = 30 + (stage.value / maxValue) * 60;
            const prevValue = i > 0 ? stages[i - 1].value : null;
            const dropRate = prevValue ? ((1 - stage.value / prevValue) * 100).toFixed(0) : null;

            return (
              <motion.div
                key={stage.label}
                className="flex flex-col items-center w-full"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
              >
                <div
                  className="relative h-14 rounded-lg overflow-hidden flex items-center justify-center"
                  style={{ width: `${widthPercent}%` }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${stage.color}`} />
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                  <div className="relative z-10 flex items-center gap-3">
                    <span className="text-white font-bold text-lg">
                      {stage.value >= 1000000
                        ? `${(stage.value / 1000000).toFixed(1)}M`
                        : stage.value >= 1000
                        ? `${(stage.value / 1000).toFixed(0)}K`
                        : stage.value.toLocaleString()}
                    </span>
                    <span className="text-white/80 text-sm">{stage.label}</span>
                  </div>
                </div>
                {dropRate && (
                  <motion.div
                    className="text-xs text-slate-400 my-0.5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 + i * 0.15 }}
                  >
                    ↓ {dropRate}% drop
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <span className="text-sm text-slate-300">
            Overall conversion: <span className="text-pink-400 font-bold">{((purchased / visitors) * 100).toFixed(2)}%</span>
          </span>
        </motion.div>
      </div>
    </div>
  );
}
