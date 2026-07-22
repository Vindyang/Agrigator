import type { AdvisoryApi } from "@/lib/api"

export type SourceItem = {
  label: string
  url: string
  timestamp?: string
}

export function formatTimestamp(value?: string | null) {
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

export function buildPriceSeries(advisory: AdvisoryApi) {
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

export function extractSources(advisory: AdvisoryApi): SourceItem[] {
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

export function mapSignalKind(
  category: AdvisoryApi["signal_category"]
): "urgent" | "monitor" | "opportunity" | null {
  switch (category) {
    case "URGENT_ACTION":
      return "urgent"
    case "MONITOR":
      return "monitor"
    case "OPPORTUNITY":
      return "opportunity"
    default:
      return null
  }
}
