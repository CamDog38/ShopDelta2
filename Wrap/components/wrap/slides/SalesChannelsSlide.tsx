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

  // Get channel icon/color
  const getChannelStyle = (channel: string) => {
    const lowerChannel = channel.toLowerCase();
    if (lowerChannel.includes("online") || lowerChannel.includes("web")) {
      return { color: "from-blue-500 to-cyan-400", icon: "🌐" };
    }
    if (lowerChannel.includes("pos") || lowerChannel.includes("point of sale")) {
      return { color: "from-green-500 to-emerald-400", icon: "🏪" };
    }
    if (lowerChannel.includes("draft") || lowerChannel.includes("manual")) {
      return { color: "from-purple-500 to-violet-400", icon: "📝" };
    }
    if (lowerChannel.includes("app") || lowerChannel.includes("mobile")) {
      return { color: "from-orange-500 to-amber-400", icon: "📱" };
    }
    return { color: "from-slate-500 to-slate-400", icon: "📊" };
  };

  return (
    <div className="relative flex h-full w-full flex-col justify-start px-12 py-8">
      <motion.div
        className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_30%,rgba(59,130,246,0.5),transparent_55%),radial-gradient(circle_at_70%_70%,rgba(16,185,129,0.4),transparent_55%)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 1 }}
      />

      <div className="relative z-10 flex h-full flex-col gap-6">
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

        {/* Total summary */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
            {formatValue(totalSales)}
          </div>
          <div className="text-xs text-slate-400 mt-1">total revenue across all channels</div>
        </motion.div>

        {/* Channel breakdown */}
        <div className="flex-1 flex flex-col justify-center gap-4">
          {channels.slice(0, 5).map((channel, i) => {
            const style = getChannelStyle(channel.channel);
            const percent = totalSales > 0 ? (channel.sales / totalSales) * 100 : 0;
            const widthPercent = maxSales > 0 ? (channel.sales / maxSales) * 100 : 0;

            return (
              <motion.div
                key={channel.channel}
                className="flex items-center gap-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">
                  {style.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white">{channel.channel}</span>
                    <span className="text-sm font-bold text-white">{formatValue(channel.sales)}</span>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${style.color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${widthPercent}%` }}
                      transition={{ duration: 0.8, delay: 0.4 + i * 0.1 }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-400">{channel.orders.toLocaleString()} orders</span>
                    <span className="text-xs text-slate-400">{percent.toFixed(1)}% of total</span>
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
