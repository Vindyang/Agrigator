import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ThumbsUp, ThumbsDown, ChevronRight, ChevronDown, ExternalLink } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

export type SignalCategory = "URGENT_ACTION" | "OPPORTUNITY" | "MONITOR" | "HOLD";

export interface Advisory {
  id: string;
  signal_category: SignalCategory;
  commodity: string;
  province: string;
  advisory_text: string;
  confidence: number;
  sources: { url: string; timestamp: string }[];
  signals: {
    price: { text: string; history: { day: number; value: number }[]; status: "warn" | "ok" | "error" };
    weather: { text: string; status: "warn" | "ok" | "error" };
    pest: { text: string; status: "warn" | "ok" | "error" };
  };
  feedback_helpful?: number;
  created_at: string;
}

const config = {
  URGENT_ACTION: {
    label: "⚠ URGENT ACTION",
    bgClass: "bg-destructive text-destructive-foreground",
    progressClass: "[&>div]:bg-destructive",
  },
  OPPORTUNITY: {
    label: "✦ OPPORTUNITY",
    bgClass: "bg-success text-success-foreground",
    progressClass: "[&>div]:bg-success",
  },
  MONITOR: {
    label: "◉ MONITOR",
    bgClass: "bg-warning text-warning-foreground",
    progressClass: "[&>div]:bg-warning",
  },
  HOLD: {
    label: "— HOLD",
    bgClass: "bg-holding text-holding-foreground",
    progressClass: "[&>div]:bg-holding",
  },
};

const statusDotColors = {
  warn: "bg-warning",
  ok: "bg-success",
  error: "bg-destructive"
};

interface AdvisoryCardProps {
  advisory: Advisory;
  onFeedback: (id: string, helpful: boolean) => void;
}

export function AdvisoryCard({ advisory, onFeedback }: AdvisoryCardProps) {
  const [feedbackState, setFeedbackState] = useState<"up" | "down" | null>(null);
  const [signalsOpen, setSignalsOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const cfg = config[advisory.signal_category];

  const handleFeedback = (isHelpful: boolean) => {
    if (feedbackState) return; // Prevent multiple votes
    setFeedbackState(isHelpful ? "up" : "down");
    onFeedback(advisory.id, isHelpful);
  };

  // Convert absolute timezone string to relative time (simplified for hackathon)
  const relativeTime = "Just now"; // You could use date-fns `formatDistanceToNow` here

  return (
    <Card className="w-full shadow-sm rounded-xl overflow-hidden border border-border bg-card">
      {/* 1. Card Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-4 border-b border-border/50 bg-muted/10">
        <Badge className={`${cfg.bgClass} hover:${cfg.bgClass} px-3 py-1 text-xs font-bold tracking-widest border-0`}>
          {cfg.label}
        </Badge>
        
        <div className="flex-1 flex justify-center text-lg font-bold text-foreground mx-4 min-w-[150px] text-center">
          {advisory.commodity} — {advisory.province}
        </div>
        
        <div className="text-xs font-medium text-muted-foreground whitespace-nowrap">
          {relativeTime}
        </div>
      </div>
      
      <CardContent className="p-6 space-y-7">
        {/* 2. Advisory Text Block */}
        <p className="text-foreground/90 leading-[1.7] text-[16px] md:text-[17px] font-medium tracking-tight">
          {advisory.advisory_text}
        </p>

        {/* 3. Confidence Bar */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-end">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Confidence Level
            </span>
            <span className="font-bold text-lg leading-none">{Math.round(advisory.confidence * 100)}%</span>
          </div>
          <Progress 
            value={advisory.confidence * 100} 
            className={`h-2.5 bg-muted ${cfg.progressClass}`} 
          />
        </div>

        {/* 4. Signal Breakdown */}
        <Collapsible open={signalsOpen} onOpenChange={setSignalsOpen} className="border border-border/60 rounded-lg overflow-hidden">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full flex items-center justify-between p-3 h-auto hover:bg-muted/50 rounded-none bg-muted/20">
              <span className="text-sm font-semibold text-primary">View signal details</span>
              {signalsOpen ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronRight className="w-4 h-4 text-primary" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="p-4 pt-1 bg-muted/5 space-y-4">
            {/* Price Signal with Sparkline */}
            <div className="flex items-center gap-4">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDotColors[advisory.signals.price.status]}`} />
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Price Trend</span>
                <span className="text-sm font-medium">{advisory.signals.price.text}</span>
              </div>
              <div className="w-24 h-8 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={advisory.signals.price.history}>
                    <YAxis domain={['auto', 'auto']} hide />
                    <Line type="monotone" dataKey="value" stroke="currentColor" className="text-foreground" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Weather Signal */}
            <div className="flex flex-row items-start gap-4">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${statusDotColors[advisory.signals.weather.status]}`} />
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Weather Trigger</span>
                <span className="text-sm font-medium">{advisory.signals.weather.text}</span>
              </div>
            </div>

            {/* Pest Signal */}
            <div className="flex flex-row items-start gap-4">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${statusDotColors[advisory.signals.pest.status]}`} />
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Pest Alert</span>
                <span className="text-sm font-medium">{advisory.signals.pest.text}</span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* 5. Sources List */}
        <Collapsible open={sourcesOpen} onOpenChange={setSourcesOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors outline-none">
            <ExternalLink className="w-4 h-4" />
            {advisory.sources.length} Data Sources
            {sourcesOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3 pl-6 border-l-2 border-border ml-2">
            <div className="flex flex-col gap-2">
              {advisory.sources.map((s, idx) => (
                <div key={idx} className="flex flex-col">
                  <a href={s.url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline font-medium break-all">
                    {new URL(s.url).hostname}
                  </a>
                  <span className="text-xs text-muted-foreground">
                    Accessed {new Date(s.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs italic text-muted-foreground pt-2">
              This advisory is AI-generated. Consult your local agricultural extension officer before making major decisions.
            </p>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      {/* 6. Card Footer - Feedback Row */}
      <CardFooter className="px-6 py-4 bg-muted/20 border-t border-border/50 flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Was this advisory helpful?</span>
        <div className="flex items-center gap-3">
          <Button 
            variant={feedbackState === "up" ? "default" : "outline"} 
            size="sm" 
            className="h-8 rounded-full px-4 border-border/60 hover:bg-muted/50"
            onClick={() => handleFeedback(true)}
            disabled={feedbackState !== null}
          >
            <ThumbsUp className={`w-4 h-4 mr-2 ${feedbackState === "up" ? "fill-primary-foreground" : ""}`} />
            {advisory.feedback_helpful || 0}
          </Button>
          <Button 
            variant={feedbackState === "down" ? "destructive" : "outline"} 
            size="sm" 
            className="h-8 rounded-full px-4 border-border/60 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => handleFeedback(false)}
            disabled={feedbackState !== null}
          >
            <ThumbsDown className="w-4 h-4 mr-2" />
            0
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
