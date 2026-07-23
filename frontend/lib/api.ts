export type SignalCategory =
  "URGENT_ACTION" | "OPPORTUNITY" | "MONITOR" | "HOLD"

export type AdvisoryApi = {
  id: number
  signal_category: SignalCategory
  commodity: string
  province: string
  advisory_text_en: string
  advisory_text_id: string
  confidence: number
  price_change_pct?: number | null
  expires_at?: string | null
  created_at: string
  feedback_helpful?: number | null
  agent_trace?: Record<string, unknown>
}

export type HealthApi = {
  status: string
  db: string
  redis: string
  last_run?: string
}

export type ConnectionState =
  "connecting" | "connected" | "reconnecting" | "polling" | "disconnected"

export type ProvinceFilter =
  | "ALL"
  | "Jawa Barat"
  | "Jawa Tengah"
  | "Jawa Timur"
  | "Sulawesi Selatan"
  | "Sumatera Utara"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"

function wsBaseUrl() {
  if (API_BASE.startsWith("https://")) {
    return API_BASE.replace("https://", "wss://")
  }
  return API_BASE.replace("http://", "ws://")
}

export function advisorySocketUrl() {
  return `${wsBaseUrl()}/ws/advisories`
}

export async function getHealth(): Promise<HealthApi> {
  const res = await fetch(`${API_BASE}/health`, { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status}`)
  }
  return res.json()
}

export async function listAdvisories(
  province: ProvinceFilter
): Promise<AdvisoryApi[]> {
  const params = new URLSearchParams({ limit: "20" })
  if (province !== "ALL") {
    params.set("province", province)
  }

  const res = await fetch(`${API_BASE}/advisories?${params.toString()}`, {
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error(`List advisories failed: ${res.status}`)
  }
  return res.json()
}

export async function runAgent(
  province: ProvinceFilter
): Promise<AdvisoryApi[]> {
  const payload = {
    province: province === "ALL" ? "Jawa Barat" : province,
  }

  const res = await fetch(`${API_BASE}/agent/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error(`Run agent failed: ${res.status}`)
  }

  return res.json()
}

export async function submitFeedback(
  id: number,
  helpful: boolean
): Promise<void> {
  const res = await fetch(`${API_BASE}/advisories/${id}/feedback`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ helpful }),
  })

  if (!res.ok) {
    throw new Error(`Feedback failed: ${res.status}`)
  }
}

export type PriceApi = {
  commodity: string
  city: string
  price: number
  delta_pct: number | null
  unit: string
  trend: { date: string; price: number }[]
  source_url: string
}

export async function fetchPrices(
  province?: string,
  days?: number
): Promise<PriceApi[]> {
  const params = new URLSearchParams({ days: String(days ?? 7) })
  if (province) params.set("province", province)
  const res = await fetch(`${API_BASE}/prices?${params.toString()}`, {
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`Fetch prices failed: ${res.status}`)
  return res.json()
}

export type CurrentWeatherApi = {
  temp: number
  humidity: number
  wind_kmh: number
  weathercode: number
  description: string
}

export type DailyForecastApi = {
  date: string
  hi: number
  lo: number
  rain_mm: number
  weathercode: number
  wind_max: number
}

export type WeatherForecastApi = {
  province: string
  current: CurrentWeatherApi
  daily: DailyForecastApi[]
  source_url: string
}

export async function fetchWeatherForecast(
  province?: string,
  days?: number
): Promise<WeatherForecastApi> {
  const params = new URLSearchParams({ days: String(days ?? 7) })
  if (province) params.set("province", province)
  const res = await fetch(`${API_BASE}/weather/forecast?${params.toString()}`, {
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`Fetch weather failed: ${res.status}`)
  return res.json()
}

export type AlertApi = {
  id: number
  alert_type: string // "pest" | "disease" | "weather"
  pest_name: string | null
  severity: string // "low" | "medium" | "high" | "critical"
  province: string
  regency: string | null
  description: string
  source_url: string
  published_at: string
}

export async function fetchAlerts(
  province?: string,
  hours?: number
): Promise<AlertApi[]> {
  const params = new URLSearchParams({
    hours: String(hours ?? 168),
    limit: "50",
  })
  if (province) params.set("province", province)
  const res = await fetch(`${API_BASE}/alerts?${params.toString()}`, {
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`Fetch alerts failed: ${res.status}`)
  return res.json()
}

export type NewsItemApi = {
  title: string
  url: string
  snippet: string
  published_at: string | null
  source: string
  category: string // "Policy" | "Market" | "Weather" | "Research"
}

export async function fetchNews(query?: string): Promise<NewsItemApi[]> {
  const params = query ? `?query=${encodeURIComponent(query)}` : ""
  const res = await fetch(`${API_BASE}/news${params}`, { cache: "no-store" })
  if (!res.ok) throw new Error(`Fetch news failed: ${res.status}`)
  return res.json()
}

export type FarmNoteApi = {
  id: number
  plot: string
  crop: string
  tag: string // "Observation" | "Action" | "Reminder" | "Meeting"
  title: string
  body: string
  created_at: string
}

export type NoteCreateBody = {
  plot: string
  crop: string
  tag: string
  title: string
  body: string
}

export async function fetchNotes(): Promise<FarmNoteApi[]> {
  const res = await fetch(`${API_BASE}/notes`, { cache: "no-store" })
  if (!res.ok) throw new Error(`Fetch notes failed: ${res.status}`)
  return res.json()
}

export async function createNote(body: NoteCreateBody): Promise<FarmNoteApi> {
  const res = await fetch(`${API_BASE}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Create note failed: ${res.status}`)
  return res.json()
}

export async function deleteNote(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/notes/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error(`Delete note failed: ${res.status}`)
}
