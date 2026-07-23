"use client"

import { useEffect, useState } from "react"

import { PageHeader, Panel, Sparkline } from "@/components/ui-kit"
import { fetchWeatherForecast, type WeatherForecastApi } from "@/lib/api"

// ── WMO weather code → icon mapping ──────────────────────────────────────────

function weatherIcon(code: number): string {
  if (code === 0) return "☀"
  if (code <= 2) return "⛅"
  if (code === 3) return "☁"
  if (code <= 48) return "🌫"
  if (code <= 57) return "☂"
  if (code <= 67) return "☂"
  if (code <= 77) return "❄"
  if (code <= 82) return "☂"
  if (code <= 86) return "❄"
  return "⛈"
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function dayAbbr(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  return date.toLocaleDateString("en-US", { weekday: "short" })
}

// ── Demo data (illustrative only) ────────────────────────────────────────────

const STATIONS = [
  {
    id: "ST-04B",
    name: "Turirejo Field",
    temp: 29.4,
    hum: 78,
    rain24: 12.4,
    status: "OK",
  },
  {
    id: "ST-07A",
    name: "Sidodadi Ridge",
    temp: 27.8,
    hum: 84,
    rain24: 22.1,
    status: "OK",
  },
  {
    id: "ST-11C",
    name: "Mulyoasri Basin",
    temp: 30.2,
    hum: 71,
    rain24: 4.2,
    status: "OK",
  },
  {
    id: "ST-02D",
    name: "Bromo Slope",
    temp: 24.6,
    hum: 88,
    rain24: 38.6,
    status: "Alert",
  },
]

const TEMP_TREND = [26, 27, 28, 27, 29, 30, 28, 27, 29, 30, 31, 30, 29, 29]
const RAIN_TREND = [2, 0, 8, 12, 4, 0, 6, 22, 18, 5, 32, 45, 20, 18]

// ── Page component ───────────────────────────────────────────────────────────

export default function WeatherPage() {
  const [data, setData] = useState<WeatherForecastApi | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const result = await fetchWeatherForecast("Jawa Timur", 7)
        if (!cancelled) setData(result)
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Failed to load forecast"
          )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // ── Loading state ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <PageHeader
          eyebrow="Monitoring"
          title="Weather Reports"
          subtitle="Loading forecast data…"
        />
        <div className="space-y-8 p-8">
          <div className="grid animate-pulse grid-cols-[1.2fr_1fr_1fr] border border-hairline">
            <div className="border-r border-hairline p-8">
              <div className="h-4 w-32 rounded bg-paper-2" />
              <div className="mt-3 h-16 w-24 rounded bg-paper-2" />
              <div className="mt-3 h-5 w-40 rounded bg-paper-2" />
              <div className="mt-1 h-4 w-56 rounded bg-paper-2" />
            </div>
            <div className="border-r border-hairline p-8">
              <div className="h-4 w-28 rounded bg-paper-2" />
              <div className="mt-3 h-12 w-20 rounded bg-paper-2" />
            </div>
            <div className="p-8">
              <div className="h-4 w-36 rounded bg-paper-2" />
              <div className="mt-3 h-12 w-20 rounded bg-paper-2" />
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── Error state ──────────────────────────────────────────────────────────

  if (error || !data) {
    return (
      <>
        <PageHeader
          eyebrow="Monitoring"
          title="Weather Reports"
          subtitle="Regional forecast, rainfall accumulation, and live station readings."
          right={
            <div className="text-right">
              <p className="text-[10px] tracking-widest text-ink-2 uppercase">
                Source
              </p>
              <p className="tabular text-xs font-semibold">Open-Meteo</p>
            </div>
          }
        />
        <div className="space-y-8 p-8">
          <div className="border border-hairline p-8 text-center">
            <p className="font-display text-lg font-semibold text-clay">
              Unable to load forecast
            </p>
            <p className="mt-1 text-sm text-ink-2">
              {error ?? "No data available. Please try again later."}
            </p>
          </div>
        </div>
      </>
    )
  }

  // ── Derived values ───────────────────────────────────────────────────────

  const current = data.current
  const daily = data.daily
  const maxRain = Math.max(...daily.map((d) => d.rain_mm), 1)
  const firstDayRain = daily.length > 0 ? daily[0].rain_mm : 0

  return (
    <>
      <PageHeader
        eyebrow="Monitoring"
        title="Weather Reports"
        subtitle="Regional forecast, rainfall accumulation, and live station readings."
        right={
          <div className="text-right">
            <p className="text-[10px] tracking-widest text-ink-2 uppercase">
              Source
            </p>
            <p className="tabular text-xs font-semibold">Open-Meteo</p>
          </div>
        }
      />

      <div className="space-y-8 p-8">
        {/* ── Now + stats row ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-[1.2fr_1fr_1fr] border border-hairline">
          <div className="border-r border-hairline p-8">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-ink-2 uppercase">
              Now — {data.province}
            </p>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="tabular font-display text-7xl leading-none font-semibold">
                {current ? Math.round(current.temp) : "--"}
              </span>
              <span className="font-display text-3xl font-medium text-ink-2">
                °C
              </span>
            </div>
            <p className="mt-3 font-display text-lg font-semibold">
              {current?.description ?? "N/A"}
            </p>
            <p className="mt-1 text-sm text-ink-2">
              Humidity {current?.humidity ?? "--"}% · Wind{" "}
              {current?.wind_kmh ?? "--"} km/h
              {current ? ` · Feels like ${Math.round(current.temp + 2)}°C` : ""}
            </p>
          </div>
          <StatBlock
            label="Rainfall (24h)"
            value={firstDayRain.toFixed(1)}
            unit="mm"
            color="text-dusk"
          />
          <StatBlock
            label="Growing degree days"
            value="--"
            unit="GDD"
            color="text-paddy"
          />
        </div>

        {/* ── 7-Day Forecast ──────────────────────────────────────────────── */}
        <Panel title="7-Day Forecast" meta="Updated via Open-Meteo">
          <div className="grid grid-cols-7">
            {daily.map((day, i) => {
              const icon = weatherIcon(day.weathercode)
              return (
                <div
                  key={day.date}
                  className={
                    "flex flex-col items-center gap-3 p-5 " +
                    (i < daily.length - 1 ? "border-r border-hairline" : "")
                  }
                >
                  <p className="text-[10px] font-semibold tracking-[0.2em] text-ink-2 uppercase">
                    {dayAbbr(day.date)}
                  </p>
                  <p className="text-2xl leading-none text-dusk">{icon}</p>
                  <div className="text-center">
                    <p className="tabular font-display text-xl font-semibold">
                      {Math.round(day.hi)}°
                    </p>
                    <p className="tabular text-xs text-ink-2">
                      {Math.round(day.lo)}°
                    </p>
                  </div>
                  <div className="flex w-full flex-col items-center gap-1">
                    <div className="relative h-16 w-6 bg-dusk/10">
                      <div
                        className="absolute bottom-0 w-full bg-dusk"
                        style={{ height: `${(day.rain_mm / maxRain) * 100}%` }}
                      />
                    </div>
                    <p className="tabular text-[10px] font-semibold text-dusk">
                      {day.rain_mm.toFixed(1)}mm
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </Panel>

        {/* ── 14-day trend graphs (illustrative) ──────────────────────────── */}
        <div className="grid grid-cols-2 gap-6">
          <Panel title="Temperature Trend (14d)" meta="Demo data">
            <div className="p-6 text-dusk">
              <Sparkline data={TEMP_TREND} width={500} height={120} />
              <div className="tabular mt-3 flex justify-between text-[10px] tracking-wider text-ink-2 uppercase">
                <span>2 wks ago</span>
                <span>Today</span>
              </div>
            </div>
          </Panel>
          <Panel title="Rainfall Trend (14d)" meta="Demo data">
            <div className="p-6 text-paddy">
              <Sparkline data={RAIN_TREND} width={500} height={120} />
              <div className="tabular mt-3 flex justify-between text-[10px] tracking-wider text-ink-2 uppercase">
                <span>2 wks ago</span>
                <span>Today</span>
              </div>
            </div>
          </Panel>
        </div>

        {/* ── Field Stations (illustrative) ───────────────────────────────── */}
        <Panel
          title="Field Stations"
          meta={`${STATIONS.length} online (Demo data)`}
        >
          <table className="w-full text-sm">
            <thead className="border-b border-hairline">
              <tr className="text-left text-[10px] font-semibold tracking-[0.15em] text-ink-2 uppercase">
                <th className="px-4 py-3 font-semibold">Station</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 text-right font-semibold">Temp °C</th>
                <th className="px-4 py-3 text-right font-semibold">Humidity</th>
                <th className="px-4 py-3 text-right font-semibold">Rain 24h</th>
                <th className="px-4 py-3 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="tabular divide-y divide-hairline">
              {STATIONS.map((s) => (
                <tr key={s.id} className="hover:bg-paper-2">
                  <td className="px-4 py-3 font-mono text-xs">{s.id}</td>
                  <td className="px-4 py-3">{s.name}</td>
                  <td className="px-4 py-3 text-right">{s.temp.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right">{s.hum}%</td>
                  <td className="px-4 py-3 text-right">
                    {s.rain24.toFixed(1)} mm
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={
                        "inline-block border px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase " +
                        (s.status === "Alert"
                          ? "border-clay/40 bg-clay/[0.06] text-clay"
                          : "border-paddy/40 bg-paddy/[0.06] text-paddy")
                      }
                    >
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </>
  )
}

// ── StatBlock sub-component ─────────────────────────────────────────────────

function StatBlock({
  label,
  value,
  unit,
  color,
}: {
  label: string
  value: string
  unit: string
  color: string
}) {
  return (
    <div className="border-r border-hairline p-8 last:border-r-0">
      <p className="text-[10px] font-semibold tracking-[0.2em] text-ink-2 uppercase">
        {label}
      </p>
      <div className="mt-3 flex items-baseline gap-2">
        <span
          className={
            "tabular font-display text-5xl leading-none font-semibold " + color
          }
        >
          {value}
        </span>
        <span className="text-sm tracking-wider text-ink-2 uppercase">
          {unit}
        </span>
      </div>
    </div>
  )
}
