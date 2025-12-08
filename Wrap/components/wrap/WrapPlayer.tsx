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
};

export function WrapPlayer({ slides, autoAdvanceMs = 6500 }: Props) {
  const [index, setIndex] = useState(0);

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

  return (
    <div className="relative flex h-full min-h-[540px] w-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white overflow-hidden">
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
                width:
                  i < index ? "100%" : i === index ? "100%" : "0%",
              }}
              transition={{
                duration: i === index ? autoAdvanceMs / 1000 : 0,
                ease: "linear",
              }}
            />
          </div>
        ))}
      </div>

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
