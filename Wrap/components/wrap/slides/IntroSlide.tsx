"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";

export function IntroSlide({ slide }: { slide: Slide }) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-16">
      <motion.div
        className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_0%_0%,rgba(129,140,248,0.5),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(236,72,153,0.5),transparent_55%)]"
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 0.4, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />

      <motion.div
        className="relative z-10 flex flex-col items-center gap-4 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.25, 0.8, 0.25, 1] }}
      >
        <span className="rounded-full bg-white/10 px-4 py-1 text-xs font-medium uppercase tracking-[0.24em] text-slate-200/80">
          Year in review
        </span>
        <h1 className="text-5xl font-semibold tracking-tight drop-shadow-[0_10px_40px_rgba(0,0,0,0.7)]">
          {slide.title}
        </h1>
        {slide.subtitle && (
          <p className="max-w-xl text-sm text-slate-200/80">
            {slide.subtitle}
          </p>
        )}
      </motion.div>
    </div>
  );
}
