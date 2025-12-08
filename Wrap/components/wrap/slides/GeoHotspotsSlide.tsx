"use client";

import { motion } from "framer-motion";
import type { Slide } from "../../../lib/wrapSlides";

type Region = { name: string; sales: number; orders: number };

// South African province codes to full names
const SA_PROVINCES: Record<string, string> = {
  "GP": "Gauteng",
  "WC": "Western Cape",
  "KZN": "KwaZulu-Natal",
  "EC": "Eastern Cape",
  "FS": "Free State",
  "MP": "Mpumalanga",
  "NW": "North West",
  "LP": "Limpopo",
  "NC": "Northern Cape",
};

// US state codes to full names (common ones)
const US_STATES: Record<string, string> = {
  "CA": "California", "NY": "New York", "TX": "Texas", "FL": "Florida",
  "IL": "Illinois", "PA": "Pennsylvania", "OH": "Ohio", "GA": "Georgia",
  "NC": "North Carolina", "MI": "Michigan", "NJ": "New Jersey", "VA": "Virginia",
  "WA": "Washington", "AZ": "Arizona", "MA": "Massachusetts", "TN": "Tennessee",
  "IN": "Indiana", "MO": "Missouri", "MD": "Maryland", "WI": "Wisconsin",
  "CO": "Colorado", "MN": "Minnesota", "SC": "South Carolina", "AL": "Alabama",
  "LA": "Louisiana", "KY": "Kentucky", "OR": "Oregon", "OK": "Oklahoma",
  "CT": "Connecticut", "UT": "Utah", "IA": "Iowa", "NV": "Nevada",
  "AR": "Arkansas", "MS": "Mississippi", "KS": "Kansas", "NM": "New Mexico",
  "NE": "Nebraska", "ID": "Idaho", "WV": "West Virginia", "HI": "Hawaii",
  "NH": "New Hampshire", "ME": "Maine", "MT": "Montana", "RI": "Rhode Island",
  "DE": "Delaware", "SD": "South Dakota", "ND": "North Dakota", "AK": "Alaska",
  "VT": "Vermont", "WY": "Wyoming", "DC": "Washington DC",
};

// Canadian province codes
const CA_PROVINCES: Record<string, string> = {
  "ON": "Ontario", "QC": "Quebec", "BC": "British Columbia", "AB": "Alberta",
  "MB": "Manitoba", "SK": "Saskatchewan", "NS": "Nova Scotia", "NB": "New Brunswick",
  "NL": "Newfoundland", "PE": "Prince Edward Island", "NT": "Northwest Territories",
  "YT": "Yukon", "NU": "Nunavut",
};

// Get full region name from code
const getFullRegionName = (code: string): string => {
  const upperCode = code.toUpperCase();
  return SA_PROVINCES[upperCode] || US_STATES[upperCode] || CA_PROVINCES[upperCode] || code;
};

export function GeoHotspotsSlide({ slide }: { slide: Slide }) {
  const { topRegion, topRegionSales, regions, currencyCode } = slide.payload as {
    topRegion: string;
    topRegionSales: number;
    regions: Region[];
    currencyCode?: string | null;
  };

  const maxSales = Math.max(...regions.map((r) => r.sales));

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
  
  // Get full name for top region
  const topRegionFullName = getFullRegionName(topRegion);

  return (
    <div className="relative flex h-full w-full flex-col justify-start px-12 py-8">
      <motion.div
        className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_80%,rgba(59,130,246,0.5),transparent_55%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.4),transparent_55%)]"
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

        <div className="flex-1 flex flex-col justify-center gap-3">
          {regions.map((region, i) => {
            const widthPercent = (region.sales / maxSales) * 100;
            const isTop = region.name === topRegion;
            const displayName = getFullRegionName(region.name);

            return (
              <motion.div
                key={region.name}
                className="flex items-center gap-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="w-32 text-right">
                  <span className={`text-sm font-medium ${isTop ? "text-emerald-400" : "text-white"}`}>
                    {displayName}
                  </span>
                </div>
                <div className="flex-1 h-8 bg-white/10 rounded-lg overflow-hidden">
                  <motion.div
                    className={`h-full rounded-lg ${isTop ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : "bg-gradient-to-r from-blue-500/80 to-blue-400/80"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPercent}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                  />
                </div>
                <div className="w-32 text-right">
                  <span className="text-sm font-semibold text-white">
                    {currencySymbol}{(region.sales / 1000).toFixed(0)}K
                  </span>
                  <span className="text-xs text-slate-400 ml-2">
                    {region.orders.toLocaleString()} orders
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <span className="text-xs text-slate-400">
            Top market: <span className="text-emerald-400 font-semibold">{topRegionFullName}</span> with {currencySymbol}{(topRegionSales / 1000000).toFixed(2)}M in sales
          </span>
        </motion.div>
      </div>
    </div>
  );
}
