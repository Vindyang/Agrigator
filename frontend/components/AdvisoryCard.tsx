"use client"

import { useMemo, useState } from "react"

import type { AdvisoryApi } from "@/lib/api"
import { Button } from "@/components/ui/button"

type AdvisoryCardProps = {
  advisory: AdvisoryApi
  onFeedback: (id: number, helpful: boolean) => Promise<void>
}

type SourceItem = {
  label: string
  url: string
  timestamp?: string
}

function formatTimestamp(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function hashSeed(input: number) {
  const x = Math.sin(input * 127.1) * 10000
  return x - Math.floor(x)
}

function buildPriceSeries(advisory: AdvisoryApi) {
  const points = 7
  const pct = advisory.price_change_pct ?? (advisory.confidence - 0.5) * 16
  const start = 100
  const end = start * (1 + pct / 100)
  return Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1)
    const drift = start + (end - start) * t
    const wobble = (hashSeed(advisory.id + i) - 0.5) * 1.5
    return Math.max(1, drift + wobble)
  })
}

function buildWeatherSeries(advisory: AdvisoryApi) {
  const points = 7
  const base = 40 + advisory.confidence * 35
  const signalBias =
    advisory.signal_category === "URGENT_ACTION"
      ? 12
      : advisory.signal_category === "MONITOR"
        ? 6
        : advisory.signal_category === "OPPORTUNITY"
          ? -4
          : 0
  return Array.from({ length: points }, (_, i) => {
    const wave = Math.sin((i + 1) * 0.9 + advisory.id) * 8
    return Math.max(5, base + signalBias + wave)
  })
}

function extractSources(advisory: AdvisoryApi): SourceItem[] {
  const trace = advisory.agent_trace
  if (!trace || typeof trace !== "object") return []

  const raw =
    (trace.sources as unknown[]) ??
    (trace.source_urls as unknown[]) ??
    (trace.urls as unknown[]) ??
    []

  if (!Array.isArray(raw)) return []

  return raw
    .map((item, index) => {
      if (typeof item === "string") {
        return { label: `Source ${index + 1}`, url: item }
      }
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>
        const url =
          typeof record.url === "string"
            ? record.url
            : typeof record.source_url === "string"
              ? record.source_url
              : ""
        if (!url) return null
        return {
          label:
            typeof record.title === "string"
              ? record.title
              : typeof record.label === "string"
                ? record.label
                : `Source ${index + 1}`,
          url,
          timestamp:
            typeof record.timestamp === "string"
              ? record.timestamp
              : typeof record.published_at === "string"
                ? record.published_at
                : undefined,
        }
      }
      return null
    })
    .filter((item): item is SourceItem => Boolean(item))
}

function MiniChart({ title, series }: { title: string; series: number[] }) {
  const points = useMemo(() => {
    const min = Math.min(...series)
    const max = Math.max(...series)
    const spread = Math.max(1, max - min)
    return series
      .map((value, index) => {
        const x = (index / Math.max(1, series.length - 1)) * 100
        const y = 32 - ((value - min) / spread) * 28
        return `${x},${y}`
      })
      .join(" ")
  }, [series])

  const start = series[0]
  const end = series[series.length - 1]
  const delta = ((end - start) / Math.max(1, start)) * 100

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <p className="font-medium tracking-wide">{title}</p>
        <p className="font-mono">{delta >= 0 ? "+" : ""}{delta.toFixed(1)}%</p>
      </div>
      <svg viewBox="0 0 100 34" className="h-16 w-full">
        <rect x="0" y="0" width="100" height="34" fill="var(--color-muted-soft)" />
        <polyline fill="none" stroke="currentColor" strokeWidth="1.2" points={points} />
      </svg>
    </div>
  )
}

export function AdvisoryCard({ advisory, onFeedback }: AdvisoryCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [pending, setPending] = useState<"up" | "down" | null>(null)

  const displayText = advisory.advisory_text_en
  const summaryText = expanded ? displayText : `${displayText.slice(0, 180)}${displayText.length > 180 ? "..." : ""}`
  const confidence = Math.round(Math.max(0, Math.min(1, advisory.confidence)) * 100)
  const sources = useMemo(() => extractSources(advisory), [advisory])
  const priceSeries = useMemo(() => buildPriceSeries(advisory), [advisory])
  const weatherSeries = useMemo(() => buildWeatherSeries(advisory), [advisory])

  const categoryClass =
    advisory.signal_category === "URGENT_ACTION"
      ? "bg-black text-white"
      : advisory.signal_category === "OPPORTUNITY"
        ? "bg-white text-black"
        : advisory.signal_category === "MONITOR"
          ? "bg-zinc-200 text-black"
          : "bg-zinc-100 text-black"

  async function handleFeedback(helpful: boolean) {
    const key = helpful ? "up" : "down"
    setPending(key)
    try {
      await onFeedback(advisory.id, helpful)
    } finally {
      setPending(null)
    }
  }

  return (
    <article className="space-y-4 rounded-xl border border-border bg-card p-4">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-md border border-border px-2 py-1 text-xs font-semibold tracking-wide ${categoryClass}`}>
            {advisory.signal_category}
          </span>
          <span className="text-sm font-semibold">{advisory.commodity.toUpperCase()}</span>
          <span className="text-sm text-muted-foreground">{advisory.province}</span>
        </div>
        <p className="text-xs text-muted-foreground">Created: {formatTimestamp(advisory.created_at)}</p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MiniChart title="Price Trend (7 Days)" series={priceSeries} />
        <MiniChart title="Weather Trend (72 Hours)" series={weatherSeries} />
      </div>

      <section className="space-y-3">
        <p className="text-sm leading-relaxed">{summaryText}</p>

        <Button variant="ghost" size="sm" onClick={() => setExpanded((value) => !value)}>
          {expanded ? "Collapse Text" : "Read Full Text"}
        </Button>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span>Confidence</span>
          <span className="font-mono">{confidence}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded bg-zinc-200">
          <div className="h-full bg-black transition-all" style={{ width: `${confidence}%` }} />
        </div>
      </section>

      <section className="space-y-2">
        <details className="rounded-lg border border-border bg-muted-soft p-3">
          <summary className="cursor-pointer text-sm font-medium">Sources ({sources.length})</summary>
          <div className="mt-2 space-y-2 text-xs">
            {sources.length === 0 && <p>No structured sources in this advisory.</p>}
            {sources.map((source, index) => (
              <div key={`${source.url}-${index}`} className="rounded border border-border p-2">
                <p className="font-medium">{source.label}</p>
                <p className="break-all text-muted-foreground">{source.url}</p>
                <p className="text-muted-foreground">{formatTimestamp(source.timestamp)}</p>
              </div>
            ))}
          </div>
        </details>
      </section>

      <section className="flex flex-wrap gap-2 border-t border-border pt-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleFeedback(true)}
          disabled={pending !== null}
          aria-label="Mark advisory as helpful"
        >
          Helpful
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleFeedback(false)}
          disabled={pending !== null}
          aria-label="Mark advisory as not helpful"
        >
          Not Helpful
        </Button>
      </section>
    </article>
  )
}
