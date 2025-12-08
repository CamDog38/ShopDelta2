"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";

type WordData = { word: string; count: number };

export function ReviewsSlide({ slide }: { slide: Slide }) {
  const { totalReviews, fiveStarCount, averageRating, topWords } = slide.payload as {
    totalReviews: number;
    fiveStarCount: number;
    averageRating: number;
    topWords: WordData[];
  };

  const maxCount = Math.max(...topWords.map((w) => w.count));

  // Generate positions for word cloud effect
  const wordPositions = topWords.map((w, i) => {
    const angle = (i / topWords.length) * Math.PI * 2;
    const radius = 80 + (w.count / maxCount) * 40;
    return {
      ...w,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.6,
      size: 12 + (w.count / maxCount) * 14,
    };
  });

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-12">
      <motion.div
        className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_50%,rgba(234,179,8,0.5),transparent_60%)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 1 }}
      />

      <div className="relative z-10 flex flex-col items-center gap-6">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-2xl font-semibold tracking-tight">{slide.title}</h2>
        </motion.div>

        {/* Stars and rating */}
        <motion.div
          className="flex items-center gap-4"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <motion.svg
                key={star}
                className={`w-8 h-8 ${star <= Math.round(averageRating) ? "text-yellow-400" : "text-slate-600"}`}
                fill="currentColor"
                viewBox="0 0 24 24"
                initial={{ opacity: 0, scale: 0, rotate: -180 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ delay: 0.3 + star * 0.1, type: "spring" }}
              >
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </motion.svg>
            ))}
          </div>
          <motion.span
            className="text-3xl font-bold text-yellow-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            {averageRating}
          </motion.span>
        </motion.div>

        {/* Big review count */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="text-5xl font-bold text-white">
            {totalReviews.toLocaleString()}
          </div>
          <div className="text-sm text-slate-300">total reviews</div>
          <div className="text-xs text-yellow-400 mt-1">
            {fiveStarCount.toLocaleString()} five-star reviews ⭐
          </div>
        </motion.div>

        {/* Word cloud */}
        <motion.div
          className="relative w-80 h-40 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {wordPositions.map((word, i) => (
            <motion.span
              key={word.word}
              className="absolute text-white/80 font-medium whitespace-nowrap"
              style={{
                left: `calc(50% + ${word.x}px)`,
                top: `calc(50% + ${word.y}px)`,
                fontSize: `${word.size}px`,
                transform: "translate(-50%, -50%)",
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 0.5 + (word.count / maxCount) * 0.5, scale: 1 }}
              transition={{ delay: 0.8 + i * 0.08, type: "spring" }}
            >
              {word.word}
            </motion.span>
          ))}
        </motion.div>

        {slide.subtitle && (
          <motion.p
            className="text-sm text-slate-200/80 text-center max-w-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            {slide.subtitle}
          </motion.p>
        )}
      </div>
    </div>
  );
}
