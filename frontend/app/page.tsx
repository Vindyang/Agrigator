"use client";

import React, { useState, useEffect } from "react";
import { 
  Menu, Globe, Activity, Clock, Loader2, CheckCircle2, 
  ServerCrash, Cloud, ThumbsUp, ThumbsDown, ChevronDown, 
  ChevronRight, ExternalLink, Database, CloudRainWind, Bug, Languages, MessageSquareText, PhoneCall, ShieldAlert
} from "lucide-react";
import { RawMaterialCharts } from "../components/RawMaterialCharts";

// --- Types ---
type SignalCategory = "URGENT_ACTION" | "OPPORTUNITY" | "MONITOR" | "HOLD";

interface Advisory {
  id: string;
  category: SignalCategory;
  commodity: string;
  province: string;
  timestamp: string;
  textEn: string;
  textId: string;
  confidence: number;
  signals: {
    price: { text: string; status: "error" | "warn" | "ok" };
    weather: { text: string; status: "error" | "warn" | "ok" };
    pest: { text: string; status: "error" | "warn" | "ok" };
  };
  sources: { title: string; url: string }[];
  feedbackUp: number;
  feedbackDown: number;
}

// --- Mock Data ---
const MOCK_ADVISORIES: Advisory[] = [
  {
    id: "adv-1",
    category: "URGENT_ACTION",
    commodity: "Rice",
    province: "West Java",
    timestamp: "8 minutes ago",
    textEn: "Rice prices in West Java have risen +16% over the past 7 days. BMKG forecasts heavy rainfall this Friday. A Brown Planthopper outbreak has been reported in Indramayu regency. It is recommended to sell existing stock within the next 48 hours before the harvest window closes.",
    textId: "Harga beras di Jawa Barat telah naik +16% selama 7 hari terakhir. BMKG memperkirakan hujan lebat hari Jumat ini. Wabah Wereng Batang Coklat telah dilaporkan di Kabupaten Indramayu. Disarankan untuk menjual stok yang ada dalam 48 jam ke depan.",
    confidence: 94,
    signals: {
      price: { text: "+16% from 7-day average", status: "error" },
      weather: { text: "Heavy rain, 85mm/day forecast Friday", status: "warn" },
      pest: { text: "Brown Planthopper, Indramayu, high severity", status: "error" }
    },
    sources: [
      { title: "hargapangan.id", url: "#" },
      { title: "bmkg.go.id", url: "#" },
      { title: "bbpopt.pertanian.go.id", url: "#" }
    ],
    feedbackUp: 12,
    feedbackDown: 0
  },
  {
    id: "adv-2",
    category: "OPPORTUNITY",
    commodity: "Corn",
    province: "East Java",
    timestamp: "2 hours ago",
    textEn: "Corn prices are stabilizing at seasonal lows in East Java. Weather conditions are optimal for planting over the next 14 days, with zero pest alerts in the region. Strong opportunity to begin planting phase.",
    textId: "Harga jagung mulai stabil pada titik terendah musiman di Jawa Timur. Kondisi cuaca sangat optimal untuk penanaman selama 14 hari ke depan, dengan nol peringatan hama. Peluang kuat untuk memulai fase tanam.",
    confidence: 82,
    signals: {
      price: { text: "Prices stabilized at seasonal low", status: "ok" },
      weather: { text: "Optimal sunlight and moderate humidity", status: "ok" },
      pest: { text: "No active alerts in region", status: "ok" }
    },
    sources: [
      { title: "bps.go.id", url: "#" },
      { title: "bmkg.go.id", url: "#" }
    ],
    feedbackUp: 8,
    feedbackDown: 1
  }
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
  { name: "PIHPS National", status: "ok" },
  { name: "BPS Indonesia", status: "ok" },
  { name: "BMKG Weather", status: "ok" },
  { name: "BBPOPT Pest Alerts", status: "ok" },
  { name: "IPPC Indonesia", status: "ok" },
  { name: "Antara News", status: "ok" }
];

const CYCLING_STEPS = [
  "Collecting price data...",
  "Checking BMKG weather forecast...",
  "Scanning BBPOPT pest alerts...",
  "Analyzing compound signals...",
  "Generating advisory...",
];

const FEATURE_PILLARS = [
  {
    title: "Multi-source Monitoring",
    desc: "PIHPS/BPS/Kementan prices + BMKG weather + BBPOPT/IPPC alerts.",
    icon: Database,
  },
  {
    title: "Compound Signal Reasoning",
    desc: "Price delta + weather + pest signals are fused into one decision.",
    icon: ShieldAlert,
  },
  {
    title: "Bilingual Advisory Output",
    desc: "Every advisory is generated in English and localized to Bahasa Indonesia.",
    icon: Languages,
  },
];

const AGENT_FLOW = [
  "1. Scheduler trigger (timed or on-demand run)",
  "2. Parallel data collection from all configured sources",
  "3. Delta analysis against 7-day baseline",
  "4. Causal research loop when anomalies are unclear",
  "5. Compound signal evaluation (URGENT_ACTION / OPPORTUNITY / MONITOR / HOLD)",
  "6. Advisory generation + translation",
  "7. Real-time delivery to web feed + feedback capture",
];

const DELIVERY_CHANNELS = [
  { name: "Web Chat UI", status: "Live", icon: MessageSquareText },
  { name: "SMS Broadcast", status: "Planned", icon: PhoneCall },
  { name: "IVR Voice Hotline", status: "Planned", icon: PhoneCall },
];

// --- Utilities ---
const getCategoryStyle = (category: SignalCategory) => {
  switch (category) {
    case "URGENT_ACTION": return { bg: "bg-destructive", text: "text-white", label: "⚠ URGENT ACTION" };
    case "OPPORTUNITY": return { bg: "bg-success", text: "text-white", label: "✦ OPPORTUNITY" };
    case "MONITOR": return { bg: "bg-warning", text: "text-warning-foreground", label: "◉ MONITOR" };
    case "HOLD": return { bg: "bg-holding", text: "text-foreground", label: "— HOLD" };
  }
};

const getStatusColor = (status: "error" | "warn" | "ok") => {
  if (status === "error") return "bg-destructive";
  if (status === "warn") return "bg-warning";
  return "bg-success";
};

// --- Main Page Component ---
export default function AgriSentinelDashboard() {
  const [agentState, setAgentState] = useState<"IDLE" | "RUNNING" | "ERROR">("IDLE");
  const [advisories, setAdvisories] = useState<Advisory[]>(MOCK_ADVISORIES);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState("All Provinces");
  const [runStepIndex, setRunStepIndex] = useState(0);
  const [lastRunTime, setLastRunTime] = useState("14m ago");

  // Agent Run Simulation
  useEffect(() => {
    if (agentState === "RUNNING") {
      const interval = setInterval(() => {
        setRunStepIndex(prev => {
          if (prev < CYCLING_STEPS.length - 1) return prev + 1;
          return prev;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [agentState]);

  const handleRunAgent = () => {
    if (agentState === "RUNNING") return;
    setRunStepIndex(0);
    setAgentState("RUNNING");
    
    setTimeout(() => {
      setAgentState("IDLE");
      setLastRunTime("just now");
      
      const newAdv: Advisory = {
        id: Date.now().toString(),
        category: "MONITOR",
        commodity: "Soybean",
        province: selectedProvince === "All Provinces" ? "Central Java" : selectedProvince,
        timestamp: "just now",
        textEn: "Soybean imports have caused a slight dip (-4%) in local prices. Weather remains neutral. Continue monitoring market volume before selling large batches.",
        textId: "Impor kedelai menyebabkan sedikit penurunan (-4%) pada harga lokal. Cuaca tetap netral. Terus pantau volume pasar sebelum menjual dalam jumlah besar.",
        confidence: 65,
        signals: {
          price: { text: "-4% from 7-day average", status: "warn" },
          weather: { text: "Neutral conditions", status: "ok" },
          pest: { text: "No alerts", status: "ok" }
        },
        sources: [{ title: "hargapangan.id", url: "#" }],
        feedbackUp: 0,
        feedbackDown: 0
      };
      
      setAdvisories(prev => [newAdv, ...prev]);
    }, 5000);
  };

  const filteredAdvisories = advisories.filter(a => 
    selectedProvince === "All Provinces" || a.province === selectedProvince
  );

  return (
    <div className="flex h-screen w-full bg-background text-foreground font-sans overflow-hidden">
      
      {/* --- Mobile Header --- */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border flex items-center justify-between px-4 z-40 shadow-sm">
        <div className="flex items-center gap-2 text-primary">
          <Globe className="w-6 h-6" />
          <h1 className="font-bold text-xl">AgriSentinel</h1>
        </div>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 bg-muted rounded-md hover:bg-muted transition"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* --- Mobile Sidebar Overlay --- */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* --- Left Sidebar (Agent Control Panel) --- */}
      <aside className={`
        fixed lg:static top-0 left-0 h-full w-[280px] bg-card border-r border-border 
        shadow-xl lg:shadow-none z-50 transform transition-transform duration-300 ease-in-out flex flex-col
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        {/* Brand Header */}
        <div className="p-6 border-b border-border/60">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Globe className="w-7 h-7" />
            <h1 className="text-2xl font-black tracking-tight">AgriSentinel</h1>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Indonesia Agricultural Intelligence Monitor
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 hide-scrollbar">
          
          {/* Agent Status Block */}
          <div className={`p-4 rounded-xl border-2 transition-colors ${
            agentState === "RUNNING" ? "border-primary bg-primary/10 shadow-sm" : 
            agentState === "ERROR" ? "border-destructive bg-destructive/10" : "border-border bg-muted/20"
          }`}>
            <div className="flex items-center gap-3">
              {agentState === "RUNNING" && (
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                  </span>
                </div>
              )}
              {agentState === "IDLE" && (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              {agentState === "ERROR" && (
                <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                  <ServerCrash className="w-5 h-5 text-destructive" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Agent Status
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {agentState === "RUNNING" ? CYCLING_STEPS[runStepIndex] :
                   agentState === "ERROR" ? "API Error" :
                   `IDLE (Last run: ${lastRunTime})`}
                </span>
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={handleRunAgent}
            disabled={agentState === "RUNNING"}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-white shadow-md transition-all flex justify-center items-center gap-2 ${
              agentState === "RUNNING" ? "bg-primary/70 cursor-not-allowed" : "bg-primary hover:bg-primary/90 active:scale-[0.98]"
            }`}
          >
            {agentState === "RUNNING" ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Running Agent...</>
            ) : "Run Agent Now"}
          </button>

          {/* Province Filter */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Province Filter
            </label>
            <div className="relative">
              <select 
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                className="w-full appearance-none bg-card border border-border text-foreground text-sm rounded-lg focus:ring-primary focus:border-primary block p-2.5 font-medium outline-none"
              >
                {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* System Stats */}
          <div className="flex flex-col gap-2">
            <div className="bg-card border border-border rounded-lg p-3 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium"><Cloud className="w-4 h-4" /> Sources Monitored</div>
              <span className="font-bold text-foreground">6</span>
            </div>
            <div className="bg-card border border-border rounded-lg p-3 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium"><Activity className="w-4 h-4" /> Active Advisories</div>
              <span className="font-bold text-primary">{advisories.length}</span>
            </div>
            <div className="bg-card border border-border rounded-lg p-3 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium"><Clock className="w-4 h-4" /> Last Updated</div>
              <span className="text-xs font-bold text-foreground">{lastRunTime}</span>
            </div>
          </div>

          {/* Health Indicators */}
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Data Source Health
            </label>
            <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-3 shadow-sm">
              {SOURCES.map((src, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success shrink-0" />
                  <span className="text-sm font-medium text-foreground/80">{src.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Signal Coverage</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground/90">
                <Database className="w-4 h-4 text-primary" />
                Price Intelligence
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-foreground/90">
                <CloudRainWind className="w-4 h-4 text-primary" />
                Weather Forecasts
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-foreground/90">
                <Bug className="w-4 h-4 text-primary" />
                Pest & Disease Alerts
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* --- Main Panel (Advisory Feed) --- */}
      <main className="flex-1 flex flex-col h-full bg-background pt-16 lg:pt-0 relative overflow-hidden">
        
        {/* Feed Header */}
        <div className="bg-card border-b border-border px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between shrink-0 shadow-sm z-10 gap-4">
          <div className="flex flex-col">
            <h2 className="text-xl font-extrabold text-foreground mb-1">Market Overview</h2>
            <p className="text-sm font-medium text-muted-foreground">Live commodity tracking</p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/15 border border-success/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            <span className="text-[10px] font-bold text-success uppercase tracking-widest">Live Feed</span>
          </div>
        </div>

        {/* Scrollable Feed */}
        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6 xl:px-8 hide-scrollbar">
          <div className="w-full max-w-[1500px] mx-auto pb-12 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
            <section>
              <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                <RawMaterialCharts />
              </div>

              <div className="flex items-center gap-2 mb-6">
                <Globe className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-extrabold text-foreground">Regional Advisories</h2>
              </div>
              
              <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
              {filteredAdvisories.map((advisory) => (
                <AdvisoryCardUI 
                  key={advisory.id} 
                  advisory={advisory} 
                />
              ))}
              
              {filteredAdvisories.length === 0 && (
                <div className="text-center py-20 text-muted-foreground">
                  <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium text-lg">No advisories for this province.</p>
                </div>
              )}
              </div>
            </section>

            <aside className="space-y-4 xl:sticky xl:top-6 self-start">
              <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                <h3 className="text-sm font-black tracking-wide text-foreground mb-3">Core Product Features</h3>
                <div className="space-y-3">
                  {FEATURE_PILLARS.map((feature) => (
                    <div key={feature.title} className="rounded-lg border border-border/70 bg-muted/20 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <feature.icon className="w-4 h-4 text-primary" />
                        <p className="text-sm font-semibold text-foreground">{feature.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{feature.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                <h3 className="text-sm font-black tracking-wide text-foreground mb-3">Agent Logic Flow</h3>
                <div className="space-y-2">
                  {AGENT_FLOW.map((step) => (
                    <p key={step} className="text-xs leading-relaxed text-foreground/90">{step}</p>
                  ))}
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                <h3 className="text-sm font-black tracking-wide text-foreground mb-3">Delivery Channels</h3>
                <div className="space-y-2">
                  {DELIVERY_CHANNELS.map((channel) => (
                    <div key={channel.name} className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <channel.icon className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">{channel.name}</span>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${channel.status === "Live" ? "text-success" : "text-muted-foreground"}`}>
                        {channel.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

    </div>
  );
}

// --- Inner Component: Advisory Card ---
function AdvisoryCardUI({ advisory }: { advisory: Advisory }) {
  const [lang, setLang] = useState<"EN" | "ID">("EN");
  const [signalsOpen, setSignalsOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [feedback, setFeedback] = useState<"UP"|"DOWN"|null>(null);

  const style = getCategoryStyle(advisory.category);

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-4 duration-500">
      
      {/* Header Row */}
      <div className="bg-muted/20 border-b border-border/60 px-5 py-4 flex flex-wrap items-center gap-3 justify-between">
        <div className={`px-3 py-1 rounded-full text-[11px] font-black tracking-widest ${style.bg} ${style.text}`}>
          {style.label}
        </div>
        <h3 className="text-lg font-bold text-foreground mx-auto sm:mx-0 flex-1 text-center sm:text-left min-w-[150px]">
          {advisory.commodity} — {advisory.province}
        </h3>
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
          {advisory.timestamp}
        </span>
      </div>

      <div className="p-6 md:p-8 flex flex-col gap-6">
        
        {/* Advisory Text */}
        <div className="flex flex-col gap-4">
          <p className="text-[17px] leading-[1.7] text-foreground/90 font-medium tracking-tight">
            {lang === "EN" ? advisory.textEn : advisory.textId}
          </p>
          
          <div className="flex bg-muted p-1 rounded-lg w-max shrink-0 border border-border">
            <button 
              onClick={() => setLang("EN")} 
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${lang === "EN" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground/80"}`}
            >EN</button>
            <button 
              onClick={() => setLang("ID")} 
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${lang === "ID" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground/80"}`}
            >ID</button>
          </div>
        </div>

        {/* Confidence Bar */}
        <div className="flex flex-col gap-2 pt-2">
          <div className="flex justify-between items-end">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Confidence Level
            </span>
            <span className="font-bold text-sm text-foreground">{advisory.confidence}%</span>
          </div>
          <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ease-out ${style.bg}`} 
              style={{ width: `${advisory.confidence}%` }}
            />
          </div>
        </div>

        <div className="h-px w-full bg-muted my-2" />

        {/* Collapsible: Signals */}
        <div>
          <button 
            onClick={() => setSignalsOpen(!signalsOpen)}
            className="flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors outline-none w-full text-left"
          >
            {signalsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            View signal details
          </button>
          
          {signalsOpen && (
            <div className="mt-4 flex flex-col gap-4 bg-muted/20 p-4 rounded-xl border border-border animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start gap-4">
                <div className={`mt-1.5 shrink-0 w-2.5 h-2.5 rounded-full ${getStatusColor(advisory.signals.price.status)}`} />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Price</span>
                  <span className="text-sm font-semibold text-foreground">{advisory.signals.price.text}</span>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className={`mt-1.5 shrink-0 w-2.5 h-2.5 rounded-full ${getStatusColor(advisory.signals.weather.status)}`} />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Weather</span>
                  <span className="text-sm font-semibold text-foreground">{advisory.signals.weather.text}</span>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className={`mt-1.5 shrink-0 w-2.5 h-2.5 rounded-full ${getStatusColor(advisory.signals.pest.status)}`} />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Pest Alert</span>
                  <span className="text-sm font-semibold text-foreground">{advisory.signals.pest.text}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Collapsible: Sources */}
        <div>
          <button 
            onClick={() => setSourcesOpen(!sourcesOpen)}
            className="flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors outline-none w-full text-left"
          >
            {sourcesOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            {advisory.sources.length} Data Sources
          </button>
          
          {sourcesOpen && (
            <div className="mt-4 flex flex-col gap-3 pl-6 border-l-2 border-success/30 animate-in fade-in slide-in-from-left-2 duration-200">
              {advisory.sources.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  <a href={s.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline">
                    {s.title}
                  </a>
                </div>
              ))}
              <div className="mt-2 text-xs italic text-muted-foreground">
                This advisory is AI-generated. Consult your local agricultural extension officer before making major decisions.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer / Feedback */}
      <div className="bg-muted/20 border-t border-border/60 px-6 py-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Was this helpful?</span>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setFeedback("UP")}
            disabled={feedback !== null}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all text-sm font-bold ${
              feedback === "UP" ? "bg-primary border-primary text-white" : 
              "bg-card border-border text-muted-foreground hover:bg-muted disabled:opacity-50"
            }`}
          >
            <ThumbsUp className={`w-4 h-4 ${feedback === "UP" ? "fill-white" : ""}`} />
            {advisory.feedbackUp + (feedback === "UP" ? 1 : 0)}
          </button>
          <button 
            onClick={() => setFeedback("DOWN")}
            disabled={feedback !== null}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all text-sm font-bold ${
              feedback === "DOWN" ? "bg-destructive border-destructive text-white" : 
              "bg-card border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 disabled:opacity-50"
            }`}
          >
            <ThumbsDown className={`w-4 h-4 ${feedback === "DOWN" ? "fill-white" : ""}`} />
            {advisory.feedbackDown + (feedback === "DOWN" ? 1 : 0)}
          </button>
        </div>
      </div>
      
    </div>
  );
}
