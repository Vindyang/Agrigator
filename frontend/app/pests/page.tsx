"use client"

import { useEffect, useState } from "react"
import {
  PageHeader,
  Panel,
  SignalPill,
  Sparkline,
  useDensity,
} from "@/components/ui-kit"
import { fetchAlerts } from "@/lib/api"
import type { AlertApi } from "@/lib/api"

// ── severity helpers ──────────────────────────────────────────────

const SEVERITY_RISK: Record<string, number> = {
  critical: 90,
  high: 70,
  medium: 50,
  low: 20,
}

function severitySignal(severity: string): "urgent" | "monitor" | null {
  if (severity === "critical" || severity === "high") return "urgent"
  if (severity === "medium") return "monitor"
  return null // low → no SignalPill
}

function severityRiskPct(severity: string): number {
  return SEVERITY_RISK[severity] ?? 20
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""}`
  const days = Math.floor(hrs / 24)
  return `${days} day${days > 1 ? "s" : ""}`
}

function riskBar(risk: number) {
  if (risk >= 70) return "bg-clay"
  if (risk >= 40) return "bg-dusk"
  return "bg-paddy"
}

function flatTrend(riskPct: number): number[] {
  return Array.from({ length: 7 }, () => riskPct)
}

// ── KPI sub-component ─────────────────────────────────────────────

function Kpi({
  label,
  value,
  color,
  isText,
}: {
  label: string
  value: number | string
  color: string
  isText?: boolean
}) {
  return (
    <div className="border-r border-hairline px-8 py-6 last:border-r-0">
      <p
        className={
          "text-[10px] font-semibold tracking-[0.2em] uppercase " + color
        }
      >
        {label}
      </p>
      <p
        className={"tabular mt-2 font-display text-4xl font-semibold " + color}
      >
        {isText ? value : String(value).padStart(2, "0")}
      </p>
    </div>
  )
}

// ── page component ────────────────────────────────────────────────

export default function PestsPage() {
  const { density } = useDensity()
  const dense = density === "officer"

  const [alerts, setAlerts] = useState<AlertApi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchAlerts(undefined, 168)
        if (!cancelled) setAlerts(data)
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // ── derived KPI values ────────────────────────────────────────

  const urgentCount = alerts.filter(
    (a) => a.severity === "critical" || a.severity === "high"
  ).length
  const monitorCount = alerts.filter((a) => a.severity === "medium").length
  const totalCount = alerts.length

  // ── loading state ─────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <PageHeader
          eyebrow="Monitoring"
          title="Pest Alerts"
          subtitle="Active pest and disease risks across all monitored plots, ranked by severity."
        />
        <div className="p-8 text-sm text-ink-2">Loading alerts…</div>
      </>
    )
  }

  // ── error state ───────────────────────────────────────────────

  if (error) {
    return (
      <>
        <PageHeader
          eyebrow="Monitoring"
          title="Pest Alerts"
          subtitle="Active pest and disease risks across all monitored plots, ranked by severity."
        />
        <div className="p-8 text-sm text-clay">
          Failed to load alerts: {error}
        </div>
      </>
    )
  }

  // ── main content ──────────────────────────────────────────────

  return (
    <>
      <PageHeader
        eyebrow="Monitoring"
        title="Pest Alerts"
        subtitle="Active pest and disease risks across all monitored plots, ranked by severity."
      />

      <div className="grid grid-cols-3 border-b border-hairline">
        <Kpi label="Urgent" value={urgentCount} color="text-clay" />
        <Kpi label="Monitor" value={monitorCount} color="text-dusk" />
        <Kpi label="Plots at risk" value={totalCount} color="text-ink" />
      </div>

      {alerts.length === 0 ? (
        <div className="p-8 text-sm text-ink-2">
          No active alerts in the last 7 days.
        </div>
      ) : (
        <div className="space-y-8 p-8">
          <Panel title="Active alerts" meta={`${alerts.length} total`}>
            <table className="w-full text-sm">
              <thead className="border-b border-hairline">
                <tr className="text-left text-[10px] font-semibold tracking-[0.15em] text-ink-2 uppercase">
                  <th className="px-4 py-3">Signal</th>
                  <th className="px-4 py-3">Crop</th>
                  <th className="px-4 py-3">Pest / Disease</th>
                  <th className="px-4 py-3">Risk</th>
                  <th className="px-4 py-3">Trend</th>
                  <th className="px-4 py-3">Recommendation</th>
                  {dense && <th className="px-4 py-3 text-right">Region</th>}
                  {dense && <th className="px-4 py-3 text-right">Updated</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {alerts.map((a) => {
                  const sig = severitySignal(a.severity)
                  const riskPct = severityRiskPct(a.severity)
                  const cropLabel = a.pest_name ?? titleCase(a.alert_type)
                  const pestLabel = titleCase(a.alert_type)
                  const recommendation = a.description.slice(0, 100)
                  const regionLabel = a.regency ?? a.province ?? "—"
                  const updatedLabel = relativeTime(a.published_at)

                  return (
                    <tr key={a.id} className="hover:bg-paper-2">
                      <td className="px-4 py-3">
                        {sig ? (
                          <SignalPill kind={sig} />
                        ) : (
                          <span className="text-[10px] font-semibold tracking-widest text-ink-2 uppercase">
                            {a.severity}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold">{cropLabel}</td>
                      <td className="px-4 py-3">{pestLabel}</td>
                      <td className="w-48 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 flex-1 bg-hairline">
                            <div
                              className={"h-full " + riskBar(riskPct)}
                              style={{ width: `${riskPct}%` }}
                            />
                          </div>
                          <span className="tabular w-8 text-right text-xs font-semibold">
                            {riskPct}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-2">
                        <Sparkline
                          data={flatTrend(riskPct)}
                          width={90}
                          height={20}
                        />
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-ink-2">
                        {recommendation}
                      </td>
                      {dense && (
                        <td className="px-4 py-3 text-right text-xs">
                          {regionLabel}
                        </td>
                      )}
                      {dense && (
                        <td className="tabular px-4 py-3 text-right text-xs text-ink-2">
                          {updatedLabel}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Panel>
        </div>
      )}
    </>
  )
}
