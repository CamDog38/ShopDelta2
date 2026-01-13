"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";

type Channel = { channel: string; sales: number; orders: number };

export function SalesChannelsSlide({ slide }: { slide: Slide }) {
  const { channels, currencyCode } = slide.payload as {
    channels: Channel[];
    currencyCode?: string | null;
  };

  // Get currency symbol
  const getCurrencySymbol = (code: string) => {
    try {
      return new Intl.NumberFormat("en", { style: "currency", currency: code })
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value || code;
    } catch {
      return code;
    }
  };
  const currencySymbol = getCurrencySymbol(currencyCode || "USD");

  const totalSales = channels.reduce((sum, c) => sum + c.sales, 0);
  const maxSales = Math.max(...channels.map((c) => c.sales));

  // Format currency for display
  const formatValue = (value: number) => {
    if (value >= 1000000) return `${currencySymbol}${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${currencySymbol}${(value / 1000).toFixed(0)}K`;
    return `${currencySymbol}${value.toFixed(0)}`;
  };

  // Get channel icon/color with better naming
  const getChannelStyle = (channel: string) => {
    const lowerChannel = channel.toLowerCase();
    if (lowerChannel.includes("online") || lowerChannel.includes("web")) {
      return { color: "from-blue-500 to-cyan-400", icon: "🌐", displayName: "Online Store" };
    }
    if (lowerChannel.includes("pos") || lowerChannel.includes("point of sale") || lowerChannel.includes("retail")) {
      return { color: "from-green-500 to-emerald-400", icon: "🏪", displayName: "Point of Sale" };
    }
    if (lowerChannel.includes("draft") || lowerChannel.includes("manual")) {
      return { color: "from-purple-500 to-violet-400", icon: "📝", displayName: "Manual Orders" };
    }
    if (lowerChannel.includes("app") || lowerChannel.includes("mobile")) {
      return { color: "from-orange-500 to-amber-400", icon: "📱", displayName: "Mobile App" };
    }
    if (lowerChannel.includes("shop") && !lowerChannel.includes("shopify")) {
      return { color: "from-emerald-500 to-teal-400", icon: "🛍️", displayName: "Shop App" };
    }
    if (lowerChannel.includes("facebook") || lowerChannel.includes("meta") || lowerChannel.includes("instagram")) {
      return { color: "from-blue-600 to-indigo-500", icon: "📘", displayName: "Meta (FB/IG)" };
    }
    if (lowerChannel.includes("google")) {
      return { color: "from-red-500 to-yellow-500", icon: "🔍", displayName: "Google" };
    }
    if (lowerChannel.includes("tiktok")) {
      return { color: "from-pink-500 to-purple-500", icon: "🎵", displayName: "TikTok" };
    }
    if (lowerChannel.includes("wholesale") || lowerChannel.includes("b2b")) {
      return { color: "from-amber-500 to-orange-400", icon: "🏢", displayName: "Wholesale/B2B" };
    }
    return { color: "from-slate-500 to-slate-400", icon: "📊", displayName: channel };
  };

  return (
    <div className="relative flex min-h-full w-full flex-col justify-start px-4 sm:px-12 py-8 sm:h-full">
      <motion.div
        className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_30%,rgba(59,130,246,0.5),transparent_55%),radial-gradient(circle_at_70%_70%,rgba(16,185,129,0.4),transparent_55%)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 1 }}
      />

      <div className="relative z-10 flex h-full flex-col gap-4 sm:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">{slide.title}</h2>
          {slide.subtitle && (
            <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-slate-200/80">{slide.subtitle}</p>
          )}
        </motion.div>

        {/* Total summary */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-2xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
            {formatValue(totalSales)}
          </div>
          <div className="text-[10px] sm:text-xs text-slate-400 mt-1">total revenue across all channels</div>
        </motion.div>

        {/* Channel breakdown */}
        <div className="flex-1 flex flex-col justify-center gap-3 sm:gap-4">
          {channels.slice(0, 5).map((channel, i) => {
            const style = getChannelStyle(channel.channel);
            const percent = totalSales > 0 ? (channel.sales / totalSales) * 100 : 0;
            const widthPercent = maxSales > 0 ? (channel.sales / maxSales) * 100 : 0;

            return (
              <motion.div
                key={channel.channel}
                className="flex items-center gap-3 sm:gap-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/10 flex items-center justify-center text-lg sm:text-xl shrink-0">
                  {style.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs sm:text-sm font-medium text-white truncate">{style.displayName}</span>
                    <span className="text-xs sm:text-sm font-bold text-white shrink-0 ml-2">{formatValue(channel.sales)}</span>
                  </div>
                  <div className="h-2 sm:h-3 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${style.color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${widthPercent}%` }}
                      transition={{ duration: 0.8, delay: 0.4 + i * 0.1 }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] sm:text-xs text-slate-400">{channel.orders.toLocaleString()} orders</span>
                    <span className="text-[10px] sm:text-xs text-slate-400">{percent.toFixed(1)}% of total</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
