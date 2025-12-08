"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Slide } from "../../lib/wrapSlides";
import { IntroSlide } from "./slides/IntroSlide";
import { BigNumberSlide } from "./slides/BigNumberSlide";
import { TopListSlide } from "./slides/TopListSlide";
import { BarTimelineSlide } from "./slides/BarTimelineSlide";
import { RecapSlide } from "./slides/RecapSlide";
import { HeatmapSlide } from "./slides/HeatmapSlide";
import { PeakHourSlide } from "./slides/PeakHourSlide";
import { GeoHotspotsSlide } from "./slides/GeoHotspotsSlide";
import { FunnelSlide } from "./slides/FunnelSlide";
import { CustomerLoyaltySlide } from "./slides/CustomerLoyaltySlide";
import { CartRecoverySlide } from "./slides/CartRecoverySlide";
import { SeasonalPeakSlide } from "./slides/SeasonalPeakSlide";
import { AovGrowthSlide } from "./slides/AovGrowthSlide";
import { TopCustomerSlide } from "./slides/TopCustomerSlide";
import { FastestSellingSlide } from "./slides/FastestSellingSlide";
import { ReviewsSlide } from "./slides/ReviewsSlide";
import { TotalRevenueSlide } from "./slides/TotalRevenueSlide";
import { OrdersCountSlide } from "./slides/OrdersCountSlide";
import { RefundRateSlide } from "./slides/RefundRateSlide";
import { DiscountUsageSlide } from "./slides/DiscountUsageSlide";
import { TopProductsSlide } from "./slides/TopProductsSlide";
import { ProductPerformanceSlide } from "./slides/ProductPerformanceSlide";
import { InventoryTurnoverSlide } from "./slides/InventoryTurnoverSlide";
import { CustomerLifetimeValueSlide } from "./slides/CustomerLifetimeValueSlide";
import { TopReferrersSlide } from "./slides/TopReferrersSlide";
import { FulfillmentSpeedSlide } from "./slides/FulfillmentSpeedSlide";
import { SalesChannelsSlide } from "./slides/SalesChannelsSlide";

type Props = {
  slides: Slide[];
  autoAdvanceMs?: number;
  /** If true, shows centered slide with black edges (for share pages). If false, uses full space (for in-app) */
  isShareMode?: boolean;
};

export function WrapPlayer({ slides, autoAdvanceMs = 6500, isShareMode = false }: Props) {
  const [index, setIndex] = useState(0);
  const [isMobileShare, setIsMobileShare] = useState(false);

  // Detect mobile for share mode only
  useEffect(() => {
    if (!isShareMode) return;
    
    const checkMobile = () => {
      // Mobile detection: small screen width OR landscape with small height
      const isMobile = window.innerWidth < 768 || (window.innerWidth < 1024 && window.innerHeight < 500);
      setIsMobileShare(isMobile);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, [isShareMode]);

  const goNext = useCallback(() => {
    setIndex((prev) => (prev + 1 < slides.length ? prev + 1 : prev));
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  useEffect(() => {
    const timer = setTimeout(goNext, autoAdvanceMs);
    return () => clearTimeout(timer);
  }, [index, goNext, autoAdvanceMs]);

  const slide = slides[index];

  function renderSlide() {
    switch (slide.type) {
      case "intro":
        return <IntroSlide slide={slide} />;
      case "bigNumber":
        return <BigNumberSlide slide={slide} />;
      case "topList":
        return <TopListSlide slide={slide} />;
      case "barTimeline":
        return <BarTimelineSlide slide={slide} />;
      case "heatmap":
        return <HeatmapSlide slide={slide} />;
      case "peakHour":
        return <PeakHourSlide slide={slide} />;
      case "geoHotspots":
        return <GeoHotspotsSlide slide={slide} />;
      case "funnel":
        return <FunnelSlide slide={slide} />;
      case "customerLoyalty":
        return <CustomerLoyaltySlide slide={slide} />;
      case "cartRecovery":
        return <CartRecoverySlide slide={slide} />;
      case "seasonalPeak":
        return <SeasonalPeakSlide slide={slide} />;
      case "aovGrowth":
        return <AovGrowthSlide slide={slide} />;
      case "topCustomer":
        return <TopCustomerSlide slide={slide} />;
      case "fastestSelling":
        return <FastestSellingSlide slide={slide} />;
      case "reviews":
        return <ReviewsSlide slide={slide} />;
      case "totalRevenue":
        return <TotalRevenueSlide slide={slide} />;
      case "ordersCount":
        return <OrdersCountSlide slide={slide} />;
      case "refundRate":
        return <RefundRateSlide slide={slide} />;
      case "discountUsage":
        return <DiscountUsageSlide slide={slide} />;
      case "topProducts":
        return <TopProductsSlide slide={slide} />;
      case "productPerformance":
        return <ProductPerformanceSlide slide={slide} />;
      case "inventoryTurnover":
        return <InventoryTurnoverSlide slide={slide} />;
      case "customerLifetimeValue":
        return <CustomerLifetimeValueSlide slide={slide} />;
      case "topReferrers":
        return <TopReferrersSlide slide={slide} />;
      case "fulfillmentSpeed":
        return <FulfillmentSpeedSlide slide={slide} />;
      case "salesChannels":
        return <SalesChannelsSlide slide={slide} />;
      case "recap":
        return <RecapSlide slide={slide} />;
      default:
        return null;
    }
  }

  // In-app mode: Full width, no black edges
  if (!isShareMode) {
    return (
      <div className="relative flex h-full min-h-[540px] w-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white overflow-hidden">
        {/* Progress bar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1 w-[480px] max-w-[80vw]">
          {slides.map((s, i) => (
            <div
              key={s.id}
              className="relative h-1 flex-1 rounded-full bg-white/10 overflow-hidden"
            >
              <motion.div
                className="absolute inset-y-0 left-0 bg-white"
                initial={{ width: i < index ? "100%" : "0%" }}
                animate={{
                  width: i < index ? "100%" : i === index ? "100%" : "0%",
                }}
                transition={{
                  duration: i === index ? autoAdvanceMs / 1000 : 0,
                  ease: "linear",
                }}
              />
            </div>
          ))}
        </div>

        {/* Main slide container - full width for in-app */}
        <div className="relative w-[960px] h-[540px] rounded-3xl bg-gradient-to-br from-indigo-500/40 via-slate-900/80 to-fuchsia-500/40 border border-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.7)] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, x: 60, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -60, scale: 0.98 }}
              transition={{ duration: 0.7, ease: [0.25, 0.8, 0.25, 1] }}
              className="w-full h-full"
            >
              {renderSlide()}
            </motion.div>
          </AnimatePresence>

          {/* Navigation controls */}
          <div className="absolute bottom-4 right-6 flex items-center gap-3 text-xs text-white/60">
            <button
              onClick={goPrev}
              className="px-3 py-1.5 rounded-full border border-white/20 bg-black/20 hover:bg-white/10 transition"
            >
              Prev
            </button>
            <button
              onClick={goNext}
              className="px-3 py-1.5 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 transition"
            >
              Next
            </button>
            <div className="ml-2">
              {index + 1} / {slides.length}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Share mode - Mobile: Scrollable with gradient fade
  if (isMobileShare) {
    return (
      <div 
        className="fixed inset-0 bg-gradient-to-br from-indigo-500/40 via-slate-900/80 to-fuchsia-500/40 text-white"
        style={{ height: '100dvh', width: '100vw' }}
      >
        {/* Progress bar - fixed at top */}
        <div className="fixed top-0 left-0 right-0 z-30 pt-2 px-3 pb-2 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-transparent">
          <div className="flex gap-0.5">
            {slides.map((s, i) => (
              <div
                key={s.id}
                className="relative h-1 flex-1 rounded-full bg-white/20 overflow-hidden"
              >
                <motion.div
                  className="absolute inset-y-0 left-0 bg-white"
                  initial={{ width: i < index ? "100%" : "0%" }}
                  animate={{
                    width: i < index ? "100%" : i === index ? "100%" : "0%",
                  }}
                  transition={{
                    duration: i === index ? autoAdvanceMs / 1000 : 0,
                    ease: "linear",
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable slide container */}
        <div className="h-full overflow-y-auto overflow-x-hidden pt-8 pb-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.5, ease: [0.25, 0.8, 0.25, 1] }}
              className="min-h-full"
            >
              {renderSlide()}
            </motion.div>
          </AnimatePresence>
          {/* Bottom padding for scroll indicator */}
          <div className="h-4" />
        </div>

        {/* Bottom gradient fade to indicate scrollable content */}
        <div className="fixed bottom-0 left-0 right-0 h-24 pointer-events-none bg-gradient-to-t from-slate-900/95 via-slate-900/50 to-transparent z-20" />

        {/* Navigation controls - fixed at bottom */}
        <div className="fixed bottom-2 right-3 flex items-center gap-2 text-xs text-white/80 z-30">
          <button
            onClick={goPrev}
            className="px-3 py-1.5 rounded-full border border-white/30 bg-black/60 hover:bg-white/20 transition backdrop-blur-sm"
          >
            Prev
          </button>
          <button
            onClick={goNext}
            className="px-3 py-1.5 rounded-full border border-white/30 bg-white/20 hover:bg-white/30 transition backdrop-blur-sm"
          >
            Next
          </button>
          <div className="ml-1 bg-black/50 px-2 py-1 rounded-full backdrop-blur-sm">
            {index + 1} / {slides.length}
          </div>
        </div>

        {/* Scroll hint indicator */}
        <motion.div 
          className="fixed bottom-14 left-1/2 -translate-x-1/2 z-20 text-white/40 text-xs flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <motion.div
            animate={{ y: [0, 4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            ↓
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Share mode - Desktop: Full screen, no scroll needed
  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-indigo-500/40 via-slate-900/80 to-fuchsia-500/40 text-white overflow-hidden"
      style={{ height: '100dvh', width: '100vw' }}
    >
      {/* Progress bar - overlaid at top */}
      <div className="absolute top-3 left-4 right-4 flex gap-1 z-20">
        {slides.map((s, i) => (
          <div
            key={s.id}
            className="relative h-1 flex-1 rounded-full bg-white/20 overflow-hidden"
          >
            <motion.div
              className="absolute inset-y-0 left-0 bg-white"
              initial={{ width: i < index ? "100%" : "0%" }}
              animate={{
                width: i < index ? "100%" : i === index ? "100%" : "0%",
              }}
              transition={{
                duration: i === index ? autoAdvanceMs / 1000 : 0,
                ease: "linear",
              }}
            />
          </div>
        ))}
      </div>

      {/* Main slide container - full viewport */}
      <div className="absolute inset-0 pt-8 pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, x: 60, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -60, scale: 0.98 }}
            transition={{ duration: 0.7, ease: [0.25, 0.8, 0.25, 1] }}
            className="w-full h-full"
          >
            {renderSlide()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation controls - bottom right */}
      <div className="absolute bottom-3 right-4 flex items-center gap-2 text-xs text-white/70 z-20">
        <button
          onClick={goPrev}
          className="px-3 py-1.5 rounded-full border border-white/20 bg-black/30 hover:bg-white/10 transition backdrop-blur-sm"
        >
          Prev
        </button>
        <button
          onClick={goNext}
          className="px-3 py-1.5 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 transition backdrop-blur-sm"
        >
          Next
        </button>
        <div className="ml-2 bg-black/20 px-2 py-1 rounded-full">
          {index + 1} / {slides.length}
        </div>
      </div>
    </div>
  );
}
