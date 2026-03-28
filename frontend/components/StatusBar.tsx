import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Activity, Clock, Loader2, ServerCrash, CheckCircle2, Cloud, FileText, Globe, AlertTriangle } from "lucide-react";

export type AgentState = "IDLE" | "RUNNING" | "ERROR";

interface StatusBarProps {
  agentState: AgentState;
  onRunAgent: () => void;
  activeAdvisoriesCount: number;
  lastRunTime: string;
  selectedProvince: string;
  setSelectedProvince: (prov: string) => void;
}

const RUN_STEPS = [
  "Collecting price data...",
  "Checking BMKG weather forecast...",
  "Scanning BBPOPT pest alerts...",
  "Analyzing compound signals...",
  "Generating advisory...",
];

const PROVINCES = [
  "All Provinces",
  "West Java",
  "Central Java",
  "East Java",
  "South Sulawesi",
  "North Sumatra"
];

const SOURCES = [
  { name: "PIHPS National", domain: "hargapangan.id", status: "ok" },
  { name: "BPS Indonesia", domain: "bps.go.id", status: "ok" },
  { name: "BMKG Weather", domain: "bmkg.go.id", status: "ok" },
  { name: "BBPOPT Pest", domain: "bbpopt.pertanian.go.id", status: "warn" },
  { name: "IPPC Indonesia", domain: "ippc.int", status: "ok" },
  { name: "Antara News", domain: "antaranews.com", status: "ok" },
];

export function StatusBar({
  agentState,
  onRunAgent,
  activeAdvisoriesCount,
  lastRunTime,
  selectedProvince,
  setSelectedProvince
}: StatusBarProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Cycle through steps when running
  useEffect(() => {
    if (agentState === "RUNNING") {
      setCurrentStepIndex(0);
      const interval = setInterval(() => {
        setCurrentStepIndex(prev => (prev < RUN_STEPS.length - 1 ? prev + 1 : prev));
      }, 1000); // 1 sec per step for visually pleasing simulation
      return () => clearInterval(interval);
    }
  }, [agentState]);

  return (
    <aside className="flex flex-col gap-6 w-full lg:w-72 shrink-0 bg-background/50 border-r border-border md:pr-6">
      <div className="flex flex-col gap-1.5 pt-2">
        <h2 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Globe className="w-6 h-6" />
          AgriSentinel
        </h2>
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Indonesia Agricultural Intelligence Monitor
        </p>
      </div>

      {/* Agent Status Block */}
      <Card className={`overflow-hidden border-2 transition-colors ${
        agentState === "RUNNING" ? "border-primary/50 shadow-md" : 
        agentState === "ERROR" ? "border-destructive/50 bg-destructive/5" : "border-border shadow-none bg-muted/20"
      }`}>
        <CardContent className="p-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {agentState === "RUNNING" && (
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            )}
            {agentState === "IDLE" && (
              <div className="w-10 h-10 rounded-full bg-sidebar-ring/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-sidebar-primary" />
              </div>
            )}
            {agentState === "ERROR" && (
              <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                <ServerCrash className="w-5 h-5 text-destructive" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Agent Status
              </span>
              <span className="text-sm font-medium">
                {agentState === "RUNNING" ? RUN_STEPS[currentStepIndex] :
                 agentState === "ERROR" ? "API Connection Failed" :
                 "Waiting..."}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        size="lg"
        onClick={onRunAgent}
        disabled={agentState === "RUNNING"}
        className="w-full font-semibold shadow-sm text-md"
      >
        {agentState === "RUNNING" ? "Running Agent..." : "Run Agent Now"}
      </Button>

      {/* Province Filter */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Monitor Province
        </label>
        <Select value={selectedProvince} onValueChange={setSelectedProvince}>
          <SelectTrigger className="w-full bg-card">
            <SelectValue placeholder="Select Province" />
          </SelectTrigger>
          <SelectContent>
            {PROVINCES.map(prov => (
              <SelectItem key={prov} value={prov}>{prov}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
        <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/60">
          <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
            <Cloud className="w-4 h-4" />
            Sources Monitored
          </div>
          <span className="font-bold">6</span>
        </div>
        
        <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/60">
          <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
            <Activity className="w-4 h-4" />
            Active Advisories
          </div>
          <span className="font-bold text-primary">{activeAdvisoriesCount}</span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/60 col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
            <Clock className="w-4 h-4" />
            Last Updated
          </div>
          <span className="font-bold text-xs">{lastRunTime}</span>
        </div>
      </div>

      {/* Health Indicators */}
      <div className="flex flex-col gap-3 pt-2">
        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Data Source Health
        </label>
        <div className="flex flex-col gap-2 bg-card p-4 rounded-xl border border-border/60">
          {SOURCES.map((source, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  source.status === "ok" ? "bg-success" :
                  source.status === "warn" ? "bg-warning" : "bg-destructive"
                }`} />
                <span className="text-sm font-medium">{source.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">{source.domain}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
