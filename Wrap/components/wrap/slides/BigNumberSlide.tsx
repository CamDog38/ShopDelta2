"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";

export function BigNumberSlide({ slide }: { slide: Slide }) {
  const label = slide.payload?.label as string | undefined;

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-16">
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_0%_100%,rgba(56,189,248,0.4),transparent_55%),radial-gradient(circle_at_100%_0%,rgba(129,140,248,0.5),transparent_55%)] opacity-40"
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 0.4, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />

      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        {label && (
          <motion.div
            className="text-xs uppercase tracking-[0.24em] text-slate-200/70"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {label}
          </motion.div>
        )}
        <motion.div
          className="text-6xl font-bold tracking-tight drop-shadow-[0_10px_40px_rgba(0,0,0,0.7)]"
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.8, 0.25, 1] }}
        >
          {slide.title}
        </motion.div>
        {slide.subtitle && (
          <motion.p
            className="max-w-md text-sm text-slate-200/80"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {slide.subtitle}
          </motion.p>
        )}
      </div>
    </div>
  );
}
