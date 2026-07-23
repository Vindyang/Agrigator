export type SignalCategory = "URGENT_ACTION" | "OPPORTUNITY" | "MONITOR" | "HOLD"

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

export type ConnectionState = "connecting" | "connected" | "reconnecting" | "polling" | "disconnected"

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

export async function listAdvisories(province: ProvinceFilter): Promise<AdvisoryApi[]> {
  const params = new URLSearchParams({ limit: "20" })
  if (province !== "ALL") {
    params.set("province", province)
  }

  const res = await fetch(`${API_BASE}/advisories?${params.toString()}`, { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`List advisories failed: ${res.status}`)
  }
  return res.json()
}

export async function runAgent(province: ProvinceFilter): Promise<AdvisoryApi[]> {
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

export async function submitFeedback(id: number, helpful: boolean): Promise<void> {
  const res = await fetch(`${API_BASE}/advisories/${id}/feedback`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ helpful }),
  })

  if (!res.ok) {
    throw new Error(`Feedback failed: ${res.status}`)
  }
}
