import type { AdvisoryApi } from "@/lib/api"

export type SourceItem = {
  type?: string
  label: string
  url: string
  timestamp?: string
}

export function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\n{2,}/g, " ")
    .replace(/\n/g, " ")
    .trim()
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

export type WeatherSnapshot = {
  precipitationMm?: number
  windKmh?: number
  hasRainAlert?: boolean
}

export function extractWeather(advisory: AdvisoryApi): WeatherSnapshot | null {
  const trace = advisory.agent_trace
  if (!trace || typeof trace !== "object") return null

  const steps = trace.steps
  if (!Array.isArray(steps)) return null

  const weatherStep = steps.find(
    (step): step is Record<string, unknown> =>
      Boolean(step) && typeof step === "object" && (step as Record<string, unknown>).tool === "get_weather"
  )
  const result = weatherStep?.result
  if (!result || typeof result !== "object") return null

  const r = result as Record<string, unknown>
  return {
    precipitationMm: typeof r.precipitation_mm === "number" ? r.precipitation_mm : undefined,
    windKmh: typeof r.wind_kmh === "number" ? r.wind_kmh : undefined,
    hasRainAlert: typeof r.has_rain_alert === "boolean" ? r.has_rain_alert : undefined,
  }
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
          type: typeof record.type === "string" ? record.type : undefined,
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
): "urgent" | "monitor" | "opportunity" | "quiet" {
  switch (category) {
    case "URGENT_ACTION":
      return "urgent"
    case "MONITOR":
      return "monitor"
    case "OPPORTUNITY":
      return "opportunity"
    default:
      return "quiet"
  }
}
