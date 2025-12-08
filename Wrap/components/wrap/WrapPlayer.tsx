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
  const [isLandscape, setIsLandscape] = useState(true);
  const [showRotatePrompt, setShowRotatePrompt] = useState(false);

  // Request fullscreen when in landscape on mobile
  const requestFullscreen = useCallback(() => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    } else if ((elem as any).webkitRequestFullscreen) {
      (elem as any).webkitRequestFullscreen();
    }
  }, []);

  // Check orientation on mobile for share mode
  useEffect(() => {
    if (!isShareMode) return;
    
    const checkOrientation = () => {
      const isLand = window.innerWidth > window.innerHeight;
      const wasPreviouslyPortrait = !isLandscape;
      setIsLandscape(isLand);
      
      // Show rotate prompt on mobile portrait
      const isMobile = window.innerWidth < 768 || window.innerHeight < 500;
      setShowRotatePrompt(isMobile && !isLand);
      
      // Request fullscreen when rotating to landscape on mobile
      if (isMobile && isLand && wasPreviouslyPortrait) {
        requestFullscreen();
      }
    };
    
    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);
    
    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, [isShareMode, isLandscape, requestFullscreen]);

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

  // Share mode: Show rotate prompt on mobile portrait
  if (isShareMode && showRotatePrompt) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white flex flex-col items-center justify-center p-8 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="text-6xl mb-6">📱</div>
          <h2 className="text-2xl font-bold mb-3">Rotate Your Device</h2>
          <p className="text-slate-400 mb-6">For the best viewing experience, please rotate your device to landscape mode.</p>
          <motion.div
            animate={{ rotate: [0, 90, 90, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            className="text-5xl"
          >
            📲
          </motion.div>
        </motion.div>
      </div>
    );
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

  // Share mode: Full screen with dynamic viewport height to handle mobile browser chrome
  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-indigo-500/40 via-slate-900/80 to-fuchsia-500/40 text-white overflow-hidden"
      style={{ height: '100dvh', width: '100vw' }}
    >
      {/* Progress bar - overlaid at top, safe area aware */}
      <div className="absolute top-[env(safe-area-inset-top,8px)] left-3 right-3 flex gap-0.5 z-20 pt-1">
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

      {/* Main slide container - uses flex to scale content */}
      <div className="absolute inset-0 flex flex-col pt-6 pb-10">
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, x: 60, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -60, scale: 0.98 }}
              transition={{ duration: 0.7, ease: [0.25, 0.8, 0.25, 1] }}
              className="w-full h-full overflow-auto"
            >
              {renderSlide()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation controls - safe area aware at bottom */}
      <div 
        className="absolute right-3 flex items-center gap-2 text-xs text-white/70 z-20"
        style={{ bottom: 'max(env(safe-area-inset-bottom, 8px), 8px)' }}
      >
        <button
          onClick={goPrev}
          className="px-2.5 py-1 rounded-full border border-white/30 bg-black/40 hover:bg-white/20 transition backdrop-blur-sm"
        >
          Prev
        </button>
        <button
          onClick={goNext}
          className="px-2.5 py-1 rounded-full border border-white/30 bg-white/20 hover:bg-white/30 transition backdrop-blur-sm"
        >
          Next
        </button>
        <div className="ml-1 bg-black/30 px-2 py-0.5 rounded-full backdrop-blur-sm">
          {index + 1} / {slides.length}
        </div>
      </div>
    </div>
  );
}
