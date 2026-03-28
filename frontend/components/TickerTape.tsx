"use client";

import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface TickerItem {
  commodity: string;
  price: string;
  trend: "up" | "down" | "flat";
  percent: number;
}

const MOCK_TICKER_DATA: TickerItem[] = [
  { commodity: "Rice (Medium)", price: "Rp 14,250", trend: "up", percent: 1.2 },
  { commodity: "Corn (Dry)", price: "Rp 5,100", trend: "down", percent: 0.8 },
  { commodity: "Chili (Red)", price: "Rp 65,000", trend: "up", percent: 5.4 },
  { commodity: "Soybean", price: "Rp 11,800", trend: "flat", percent: 0.0 },
];

export function TickerTape() {
  return (
    <div className="w-full bg-sidebar/5 border-b border-border overflow-x-auto whitespace-nowrap hide-scrollbar flex items-center px-4 py-2 shrink-0">
      <div className="flex gap-6 min-w-max mx-auto md:mx-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center pr-2 border-r border-border/50 h-5">
          National Avg
        </span>
        {MOCK_TICKER_DATA.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{item.commodity}</span>
            <span className="text-sm font-semibold">{item.price}</span>
            <div
              className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded ${
                item.trend === "up"
                  ? "text-destructive bg-destructive/10"
                  : item.trend === "down"
                  ? "text-success bg-success/10"
                  : "text-muted-foreground bg-muted"
              }`}
            >
              {item.trend === "up" ? (
                <ArrowUpRight className="w-3 h-3 mr-0.5" />
              ) : item.trend === "down" ? (
                <ArrowDownRight className="w-3 h-3 mr-0.5" />
              ) : (
                <Minus className="w-3 h-3 mr-0.5" />
              )}
              {item.percent}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
