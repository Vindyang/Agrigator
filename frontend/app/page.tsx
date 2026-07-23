"use client"

import { useMemo, useState } from "react"

import { useAdvisoryFeed } from "@/components/ChatFeed"
import { MarkdownText, PageHeader, SignalPill } from "@/components/ui-kit"
import {
  extractSources,
  extractWeather,
  formatTimestamp,
  mapSignalKind,
  stripMarkdown,
} from "@/lib/advisory"
import { type AdvisoryApi, type ConnectionState, type ProvinceFilter, runAgent } from "@/lib/api"

const PROVINCES: ProvinceFilter[] = [
  "ALL",
  "Jawa Barat",
  "Jawa Tengah",
  "Jawa Timur",
  "Sulawesi Selatan",
  "Sumatera Utara",
]

const CONNECTION_LABEL: Record<ConnectionState, string> = {
  connecting: "Connecting",
  connected: "Connected",
  reconnecting: "Reconnecting",
  polling: "Polling fallback",
  disconnected: "Disconnected",
}

const SIGNAL_STYLE = {
  urgent: { text: "text-clay", border: "border-l-clay", bg: "bg-clay/[0.03]" },
  monitor: { text: "text-dusk", border: "border-l-dusk", bg: "bg-dusk/[0.03]" },
  opportunity: { text: "text-turmeric", border: "border-l-turmeric", bg: "bg-turmeric/[0.03]" },
  quiet: { text: "text-ink-2", border: "border-l-hairline", bg: "" },
} as const

const QUEUE_PRIORITY: Record<ReturnType<typeof mapSignalKind>, number> = {
  urgent: 0,
  monitor: 1,
  opportunity: 2,
  quiet: 3,
}

export default function DashboardPage() {
  const [province, setProvince] = useState<ProvinceFilter>("ALL")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [lastRunText, setLastRunText] = useState("Never")

  const { advisories, loading, error, connection, handleFeedback } = useAdvisoryFeed(province)

  const queue = useMemo(
    () =>
      [...advisories].sort(
        (a, b) =>
          QUEUE_PRIORITY[mapSignalKind(a.signal_category)] -
          QUEUE_PRIORITY[mapSignalKind(b.signal_category)]
      ),
    [advisories]
  )
  const quietCount = advisories.filter((a) => mapSignalKind(a.signal_category) === "quiet").length

  const counts = {
    urgent: advisories.filter((a) => mapSignalKind(a.signal_category) === "urgent").length,
    monitor: advisories.filter((a) => mapSignalKind(a.signal_category) === "monitor").length,
    opportunity: advisories.filter((a) => mapSignalKind(a.signal_category) === "opportunity").length,
  }

  const selected = queue.find((a) => a.id === selectedId) ?? queue[0] ?? null

  async function handleRunAgent() {
    setIsRunning(true)
    try {
      const results = await runAgent(province)
      const time = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      setLastRunText(`${time} (${results.length} advisories)`)
    } catch {
      setLastRunText("Run failed")
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Monitoring"
        title="Dashboard"
        subtitle="Live advisory queue across monitored provinces, sorted by most recent."
        right={
          <div className="flex items-center gap-4">
            <select
              value={province}
              onChange={(event) => setProvince(event.target.value as ProvinceFilter)}
              className="border border-hairline bg-paper px-2 py-1.5 text-xs font-semibold uppercase tracking-wider"
              aria-label="Province filter"
            >
              {PROVINCES.map((value) => (
                <option key={value} value={value}>
                  {value === "ALL" ? "All Provinces" : value}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleRunAgent}
              disabled={isRunning}
              className="bg-paddy px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-paper hover:brightness-110 disabled:opacity-50"
            >
              {isRunning ? "Running..." : "Run Agent"}
            </button>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-ink-2">{CONNECTION_LABEL[connection]}</p>
              <p className="text-xs font-semibold tabular">Last run {lastRunText}</p>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-3 border-b border-hairline">
        <StatusCell kind="urgent" count={counts.urgent} label="Urgent Action" hint="Act today" />
        <StatusCell kind="monitor" count={counts.monitor} label="Monitor" hint="Trending, no action yet" />
        <StatusCell kind="opportunity" count={counts.opportunity} label="Opportunity" hint="Favorable market signals" />
      </div>

      <div className="grid grid-cols-[1fr_380px]">
        <div className="space-y-8 border-r border-hairline p-8">
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em]">Priority Queue</h2>
              <span className="tabular text-[10px] font-medium uppercase tracking-wider text-ink-2">
                {quietCount > 0 ? `${quietCount} quiet` : "All clear"}
              </span>
            </div>

            {loading && <p className="text-sm text-ink-2">Loading advisories...</p>}
            {error && <p className="text-sm text-clay">{error}</p>}

            {!loading && queue.length === 0 && (
              <div className="border border-hairline p-6 text-sm">
                <p className="font-semibold">No advisories yet</p>
                <p className="mt-1 text-ink-2">
                  Run the agent to receive the latest advisories for the selected province.
                </p>
              </div>
            )}

            {queue.length > 0 && (
              <div className="divide-y divide-hairline border border-hairline">
                {queue.map((advisory) => (
                  <AdvisoryRow
                    key={advisory.id}
                    advisory={advisory}
                    active={advisory.id === selected?.id}
                    onSelect={() => setSelectedId(advisory.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {selected && <DetailPanel advisory={selected} onFeedback={handleFeedback} />}
      </div>
    </>
  )
}

function StatusCell({
  kind,
  count,
  label,
  hint,
}: {
  kind: "urgent" | "monitor" | "opportunity"
  count: number
  label: string
  hint: string
}) {
  const color = SIGNAL_STYLE[kind].text
  return (
    <div className="border-r border-hairline px-8 py-6 last:border-r-0">
      <p className={"text-[10px] font-semibold uppercase tracking-[0.2em] " + color}>{label}</p>
      <div className="mt-2 flex items-baseline gap-3">
        <span className={"font-display tabular text-5xl font-semibold " + color}>
          {String(count).padStart(2, "0")}
        </span>
        <span className="text-xs text-ink-2">{hint}</span>
      </div>
    </div>
  )
}

function AdvisoryRow({
  advisory,
  active,
  onSelect,
}: {
  advisory: AdvisoryApi
  active: boolean
  onSelect: () => void
}) {
  const kind = mapSignalKind(advisory.signal_category)
  const s = SIGNAL_STYLE[kind]

  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        "flex w-full items-start gap-6 border-l-4 p-4 text-left " +
        s.border +
        " " +
        (active ? "bg-paper-2" : s.bg + " hover:bg-paper-2")
      }
    >
      <div className="w-40 shrink-0">
        <SignalPill kind={kind} />
        <p className="mt-2 font-display text-base font-semibold leading-tight">{advisory.commodity}</p>
        <p className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-2">{advisory.province}</p>
      </div>

      <div className="w-24 shrink-0">
        <p className={"font-display tabular text-2xl font-semibold " + s.text}>
          {Math.round(advisory.confidence * 100)}%
        </p>
        <p className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-2">Confidence</p>
      </div>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm leading-snug">{stripMarkdown(advisory.advisory_text_en)}</p>
      </div>
    </button>
  )
}

function DetailPanel({
  advisory,
  onFeedback,
}: {
  advisory: AdvisoryApi
  onFeedback: (id: number, helpful: boolean) => Promise<void>
}) {
  const kind = mapSignalKind(advisory.signal_category)
  const weather = extractWeather(advisory)
  const sources = extractSources(advisory)
  const priceSourceNum = sources.findIndex((s) => s.type === "price") + 1
  const weatherSourceNum = sources.findIndex((s) => s.type === "weather") + 1
  const [pending, setPending] = useState<"up" | "down" | null>(null)

  async function submit(helpful: boolean) {
    setPending(helpful ? "up" : "down")
    try {
      await onFeedback(advisory.id, helpful)
    } finally {
      setPending(null)
    }
  }

  return (
    <aside className="animate-slide-in-right space-y-8 bg-paper p-6">
      <header className="space-y-3">
        <div className="flex items-center gap-2">
          <SignalPill kind={kind} />
          <span className="tabular text-[10px] font-medium uppercase tracking-widest text-ink-2">
            #{advisory.id}
          </span>
        </div>
        <h2 className="font-display text-2xl font-semibold leading-tight">
          {advisory.commodity} — {advisory.province}
        </h2>
        <MarkdownText className="text-ink-2">{advisory.advisory_text_en}</MarkdownText>
      </header>

      <div className="space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em]">Conditions</h3>
        <div className="grid grid-cols-2 border border-hairline">
          <div className="border-r border-b border-hairline p-3">
            <p className="text-[10px] uppercase tracking-wider text-ink-2">Confidence</p>
            <p className="font-display tabular text-xl font-semibold">
              {Math.round(advisory.confidence * 100)}%
            </p>
          </div>
          <div className="border-b border-hairline p-3">
            <p className="text-[10px] uppercase tracking-wider text-ink-2">
              Price change
              {priceSourceNum > 0 && <CitationMark num={priceSourceNum} />}
            </p>
            <p className="font-display tabular text-xl font-semibold">
              {advisory.price_change_pct != null ? `${advisory.price_change_pct.toFixed(1)}%` : "-"}
            </p>
          </div>
          <div className="border-r border-hairline p-3">
            <p className="text-[10px] uppercase tracking-wider text-ink-2">
              Rainfall (72h)
              {weatherSourceNum > 0 && <CitationMark num={weatherSourceNum} />}
            </p>
            <p className="font-display tabular text-xl font-semibold">
              {weather?.precipitationMm != null ? `${weather.precipitationMm.toFixed(1)} mm` : "-"}
            </p>
          </div>
          <div className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-ink-2">
              Wind
              {weatherSourceNum > 0 && <CitationMark num={weatherSourceNum} />}
            </p>
            <p className="font-display tabular text-xl font-semibold">
              {weather?.windKmh != null ? `${weather.windKmh.toFixed(1)} km/h` : "-"}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em]">Sources</h3>
        {sources.length === 0 ? (
          <p className="text-xs text-ink-2">No structured sources in this advisory.</p>
        ) : (
          <ul className="space-y-2 text-[11px]">
            {sources.map((source, index) => (
              <li key={`${source.url}-${index}`} className="border-b border-hairline pb-1.5">
                <p className="font-semibold">
                  <span className="tabular text-ink-2">[{index + 1}]</span> {source.label}
                </p>
                <p className="break-all text-ink-2">{source.url}</p>
                {source.timestamp && <p className="tabular text-ink-2">{formatTimestamp(source.timestamp)}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          type="button"
          onClick={() => submit(true)}
          disabled={pending !== null}
          className="bg-paddy py-2.5 text-xs font-semibold uppercase tracking-wider text-paper hover:brightness-110 disabled:opacity-50"
        >
          Helpful
        </button>
        <button
          type="button"
          onClick={() => submit(false)}
          disabled={pending !== null}
          className="border border-hairline py-2.5 text-xs font-semibold uppercase tracking-wider hover:bg-paper-2 disabled:opacity-50"
        >
          Not helpful
        </button>
      </div>

      <p className="border-t border-hairline pt-4 text-[10px] text-ink-2">
        Created {formatTimestamp(advisory.created_at)}
      </p>
    </aside>
  )
}

function CitationMark({ num }: { num: number }) {
  return <sup className="tabular ml-0.5 text-paddy">[{num}]</sup>
}
