import { useRef, useEffect } from "react";
import { AdvisoryCard, Advisory } from "./AdvisoryCard";
import { TickerTape } from "./TickerTape";
import { ScrollArea } from "./ui/scroll-area";
import { Sprout } from "lucide-react";
import { RawMaterialCharts } from "./RawMaterialCharts";

interface ChatFeedProps {
  advisories: Advisory[];
  onFeedback: (id: string, helpful: boolean) => void;
  selectedProvince: string;
}

export function ChatFeed({ advisories, onFeedback, selectedProvince }: ChatFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const filteredAdvisories = advisories.filter(advisory => {
    if (selectedProvince === "All Provinces") return true;
    return advisory.province === selectedProvince;
  });

  // Auto-scroll to top when a new advisory arrives
  useEffect(() => {
    // In our design, new cards prepend to the top, so we scroll to top instead of bottom.
    // The feed is essentially a reverse chron timeline.
  }, [filteredAdvisories.length]);

  return (
    <div className="flex flex-col h-full w-full bg-background rounded-xl overflow-hidden shadow-sm border border-border">
      {/* 1. Top Ticker Tape */}
      <TickerTape />

      {/* 2. Feed Header */}
      <div className="p-4 px-6 border-b border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-3">
        <h3 className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          Latest Advisories
          <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-success/15 border border-success/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            <span className="text-[10px] font-bold text-success uppercase tracking-wider">Live</span>
          </div>
        </h3>
        {selectedProvince !== "All Provinces" && (
          <div className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
            Filtering by: {selectedProvince}
          </div>
        )}
      </div>

      <div className="flex-1 p-8 bg-gray-50 overflow-y-auto">
  <h1 className="text-2xl font-bold text-gray-900 mb-6">Market Overview</h1>
  
  {/* The 4 Raw Material Charts go here */}
  <RawMaterialCharts />

  <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">Regional Intelligence Feed</h2>
  
  {/* Your AI AdvisoryCards go here */}
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* <AdvisoryCard /> */}
  </div>
</div>

      {/* 3. Main Scrollable Feed Area */}
      <ScrollArea className="flex-1 p-4 md:p-6 bg-muted/10 h-full">
        <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-8">
          
          {/* Empty State */}
          {filteredAdvisories.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center px-4 animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Sprout className="w-10 h-10 text-primary/60" />
              </div>
              <h4 className="text-lg font-bold text-foreground mb-2">No advisories yet</h4>
              <p className="text-sm font-medium text-muted-foreground max-w-sm">
                The intelligence feed is empty for this region. Click 'Run Agent Now' to start scanning external sources.
              </p>
            </div>
          )}

          {/* Advisory Cards */}
          {filteredAdvisories.map((advisory) => (
            <div key={advisory.id} className="animate-in slide-in-from-top-4 fade-in duration-500 fill-mode-both">
              <AdvisoryCard advisory={advisory} onFeedback={onFeedback} />
            </div>
          ))}

          <div ref={bottomRef} className="h-1" />
        </div>
      </ScrollArea>
    </div>
  );
}
