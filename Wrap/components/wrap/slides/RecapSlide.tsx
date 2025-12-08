"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";

export function RecapSlide({ slide }: { slide: Slide }) {
  const handle = (slide.payload?.handle as string | undefined) || "";

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-16">
      <motion.div
        className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_100%_0%,rgba(129,140,248,0.45),transparent_55%),radial-gradient(circle_at_0%_100%,rgba(45,212,191,0.45),transparent_55%)]"
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 0.4, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />

      <motion.div
        className="relative z-10 flex flex-col items-center gap-4 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.25, 0.8, 0.25, 1] }}
      >
        <h2 className="text-4xl font-semibold tracking-tight drop-shadow-[0_10px_40px_rgba(0,0,0,0.7)]">
          {slide.title}
        </h2>
        {slide.subtitle && (
          <p className="max-w-md text-sm text-slate-100/80">{slide.subtitle}</p>
        )}
        {handle && (
          <div className="mt-4 flex items-center gap-2 rounded-full bg-black/30 px-4 py-2 text-xs text-slate-100/90 border border-white/15">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Stay tuned for {handle}'s next chapter.</span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
