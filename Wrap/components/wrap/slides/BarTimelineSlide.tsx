"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";

export function BarTimelineSlide({ slide }: { slide: Slide }) {
  const months = (slide.payload?.months || []) as {
    month: string;
    posts: number;
    views: number;
  }[];

  const maxViews = months.reduce(
    (max, m) => (m.views > max ? m.views : max),
    0
  );

  return (
    <div className="relative flex h-full w-full flex-col justify-center px-16">
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.4),transparent_55%),radial-gradient(circle_at_0%_100%,rgba(129,140,248,0.4),transparent_55%)] opacity-40"
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 0.4, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />

      <div className="relative z-10 flex flex-col gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.8, 0.25, 1] }}
        >
          <h2 className="text-3xl font-semibold tracking-tight">
            {slide.title}
          </h2>
          {slide.subtitle && (
            <p className="mt-1 text-sm text-slate-100/80">{slide.subtitle}</p>
          )}
        </motion.div>

        <motion.div
          className="mt-4 flex h-52 items-end gap-3 rounded-2xl bg-black/30 px-4 pb-4 pt-3 backdrop-blur-sm border border-white/10"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: 0.06 },
            },
          }}
        >
          {months.map((m) => {
            const height = maxViews ? (m.views / maxViews) * 100 : 0;
            return (
              <motion.div
                key={m.month}
                className="flex flex-1 flex-col items-center justify-end gap-1"
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
              >
                <motion.div
                  className="w-full rounded-t-xl bg-gradient-to-t from-indigo-400 to-sky-300 shadow-[0_8px_32px_rgba(56,189,248,0.6)]"
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.7, ease: [0.25, 0.8, 0.25, 1] }}
                />
                <div className="text-[10px] text-slate-200/80">{m.month}</div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
