"use client"

import { useState } from "react"
import { Bell, Droplets, Leaf, Sprout, Thermometer } from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

const bars = [42, 65, 30, 6, 58, 76, 51]
const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function MetricCard({
  title,
  value,
  badge,
  icon,
}: {
  title: string
  value: string
  badge: string
  icon: React.ReactNode
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-3 shadow-[0_2px_6px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-muted">{icon}</div>
        <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-semibold text-muted-foreground">{badge}</span>
      </div>
      <p className="mt-2 text-[18px] font-bold leading-none tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-[12px] font-medium text-muted-foreground">{title}</p>
    </article>
  )
}

function RingGauge({ value, color, title, subtitle }: { value: number; color: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="grid h-11 w-11 place-items-center rounded-full"
        style={{ background: `conic-gradient(${color} ${value}%, var(--border) ${value}% 100%)` }}
      >
        <div className="grid h-[34px] w-[34px] place-items-center rounded-full bg-muted text-[9px] font-bold text-foreground">
          {value}%
        </div>
      </div>
      <div>
        <p className="text-[14px] font-bold leading-none text-foreground">{title}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  )
}

export default function Page() {
  const [activeRange, setActiveRange] = useState<"7" | "14">("7")

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-5 py-3">
          <div>
            <h2 className="text-[20px] font-bold leading-none tracking-tight text-foreground">Farm Overview</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">Welcome back, John. Here is what&apos;s happening today.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 items-center rounded-full bg-muted px-4 text-muted-foreground">
              <input
                type="text"
                placeholder="Search farm data..."
                className="w-[180px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <button className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-foreground">
              <Bell className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <section className="grid gap-4 xl:grid-cols-4">
            <MetricCard title="Temperature" value="24°C" badge="+2° Optimal" icon={<Thermometer className="h-5 w-5 text-foreground" />} />
            <MetricCard title="Soil Moisture" value="42%" badge="-5% Low" icon={<Droplets className="h-5 w-5 text-foreground" />} />
            <MetricCard title="Pest Risk" value="Low" badge="No active threats" icon={<Sprout className="h-5 w-5 text-foreground" />} />
            <MetricCard title="Est. Yield Value" value="$12,450" badge="+12.4% Market" icon={<Leaf className="h-5 w-5 text-foreground" />} />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1fr_260px]">
            <article className="rounded-2xl border border-border bg-card p-4 shadow-[0_2px_6px_rgba(0,0,0,0.06)]">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[16px] font-bold tracking-tight text-foreground">Weather Forecast Trends</h3>
                  <p className="mt-1 text-[12px] text-muted-foreground">Expected precipitation and temperature for the next 7 days</p>
                </div>
                <div className="flex gap-1.5 rounded-lg bg-muted p-1">
                  <button
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold ${activeRange === "7" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
                    onClick={() => setActiveRange("7")}
                  >
                    7 Days
                  </button>
                  <button
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold ${activeRange === "14" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
                    onClick={() => setActiveRange("14")}
                  >
                    14 Days
                  </button>
                </div>
              </div>

              <div className="relative rounded-xl border border-border bg-muted/50 p-4">
                <div className="pointer-events-none absolute inset-x-5 top-1/2 h-px bg-border" />
                <div className="pointer-events-none absolute inset-x-5 top-[30%] h-px bg-border" />
                <div className="pointer-events-none absolute inset-x-5 bottom-[22%] h-px bg-border" />

                <div className="relative z-10 grid grid-cols-7 items-end gap-3 pb-6 pt-4">
                  {bars.map((bar, idx) => (
                    <div key={labels[idx]} className="flex flex-col items-center gap-2">
                      <div
                        className={`w-full rounded-xl ${idx === 1 || idx === 5 ? "bg-chart-2" : "bg-chart-1"}`}
                        style={{ height: `${bar * 3.2}px` }}
                      />
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{labels[idx]}</span>
                    </div>
                  ))}
                </div>

                <svg viewBox="0 0 100 30" className="pointer-events-none absolute inset-x-5 top-[34%] h-[38%] w-[calc(100%-40px)]">
                  <path
                    d="M2 20 C 12 14, 18 10, 28 12 C 38 14, 44 18, 54 16 C 64 14, 70 8, 80 6 C 88 5, 93 8, 98 10"
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray="3 3"
                    strokeWidth="0.8"
                    className="text-foreground"
                  />
                </svg>
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-card p-4 shadow-[0_2px_6px_rgba(0,0,0,0.06)]">
              <h3 className="text-[16px] font-bold tracking-tight text-foreground">Pest Monitoring</h3>
              <p className="mt-1 text-[12px] text-muted-foreground">Active field sensors report</p>

              <div className="mt-3 space-y-3">
                <RingGauge value={75} color="oklch(0.205 0 0)" title="Sector Alpha" subtitle="No detection in 48h" />
                <RingGauge value={32} color="oklch(0.439 0 0)" title="Sector Bravo" subtitle="Minor activity detected" />
                <RingGauge value={12} color="oklch(0.556 0 0)" title="Sector Delta" subtitle="Critical warning" />
              </div>

              <button className="mt-4 w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                View Detailed Map
              </button>
            </article>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 shadow-[0_2px_6px_rgba(0,0,0,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-[16px] font-bold tracking-tight text-foreground">Wholesale Crop Price Index</h3>
                <p className="mt-1 text-[12px] text-muted-foreground">Live updates for regional exchanges</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
                <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-chart-5" /> Corn</div>
                <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-chart-3" /> Soybeans</div>
                <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-chart-2" /> Wheat</div>
              </div>
            </div>
            <div className="mt-4 h-32 rounded-xl border border-dashed border-border bg-muted/50" />
          </section>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
