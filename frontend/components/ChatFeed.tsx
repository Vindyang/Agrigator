"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { AdvisoryCard } from "@/components/AdvisoryCard"
import {
  advisorySocketUrl,
  type AdvisoryApi,
  type ConnectionState,
  listAdvisories,
  type ProvinceFilter,
  submitFeedback,
} from "@/lib/api"

type ChatFeedProps = {
  province: ProvinceFilter
  onAdvisoriesChange: (rows: AdvisoryApi[]) => void
  onConnectionChange: (value: ConnectionState) => void
}

function compareByCreatedAt(a: AdvisoryApi, b: AdvisoryApi) {
  const ta = new Date(a.created_at).getTime()
  const tb = new Date(b.created_at).getTime()
  return tb - ta
}

function mergeRows(current: AdvisoryApi[], incoming: AdvisoryApi[]) {
  const index = new Map<number, AdvisoryApi>()
  for (const row of current) index.set(row.id, row)
  for (const row of incoming) index.set(row.id, row)
  return Array.from(index.values()).sort(compareByCreatedAt).slice(0, 60)
}

function parseSocketMessage(raw: string): AdvisoryApi | null {
  try {
    const parsed = JSON.parse(raw) as AdvisoryApi
    if (typeof parsed?.id === "number" && typeof parsed?.province === "string") {
      return parsed
    }
  } catch {
    return null
  }
  return null
}

export function ChatFeed({ province, onAdvisoriesChange, onConnectionChange }: ChatFeedProps) {
  const [advisories, setAdvisories] = useState<AdvisoryApi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const connectRef = useRef<() => void>(() => {})
  const reconnectRef = useRef<number | null>(null)
  const pollRef = useRef<number | null>(null)
  const attemptsRef = useRef(0)
  const mountedRef = useRef(true)

  const visible = useMemo(
    () => (province === "ALL" ? advisories : advisories.filter((item) => item.province === province)),
    [advisories, province]
  )

  useEffect(() => {
    onAdvisoriesChange(visible)
  }, [visible, onAdvisoriesChange])

  const clearTimers = useCallback(() => {
    if (reconnectRef.current) {
      window.clearTimeout(reconnectRef.current)
      reconnectRef.current = null
    }
    if (pollRef.current) {
      window.clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const fetchSnapshot = useCallback(async () => {
    const data = await listAdvisories(province)
    if (!mountedRef.current) return
    setAdvisories((current) => mergeRows(current, data))
  }, [province])

  const startPolling = useCallback(() => {
    if (pollRef.current) return
    onConnectionChange("polling")
    pollRef.current = window.setInterval(() => {
      void fetchSnapshot()
    }, 25000)
  }, [fetchSnapshot, onConnectionChange])

  const connect = useCallback(() => {
    if (!mountedRef.current) return
    onConnectionChange(attemptsRef.current === 0 ? "connecting" : "reconnecting")

    const ws = new WebSocket(advisorySocketUrl())
    wsRef.current = ws

    ws.onopen = () => {
      attemptsRef.current = 0
      onConnectionChange("connected")
      if (pollRef.current) {
        window.clearInterval(pollRef.current)
        pollRef.current = null
      }
    }

    ws.onmessage = (event) => {
      const record = parseSocketMessage(event.data)
      if (!record) return
      if (province !== "ALL" && record.province !== province) return
      setAdvisories((current) => mergeRows(current, [record]))
      setError(null)
    }

    ws.onerror = () => {
      setError("Live connection is unstable. Switched to periodic refresh.")
      startPolling()
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      attemptsRef.current += 1
      startPolling()
      onConnectionChange("disconnected")
      const wait = Math.min(15000, 1000 * attemptsRef.current)
      reconnectRef.current = window.setTimeout(() => connectRef.current(), wait)
    }
  }, [onConnectionChange, province, startPolling])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    mountedRef.current = true
    clearTimers()

    const initTimer = window.setTimeout(() => {
      void fetchSnapshot()
        .catch(() => {
          setError("Failed to load initial advisories from server.")
        })
        .finally(() => {
          if (mountedRef.current) setLoading(false)
        })
    }, 0)

    connect()

    return () => {
      mountedRef.current = false
      window.clearTimeout(initTimer)
      clearTimers()
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [clearTimers, connect, fetchSnapshot])

  async function handleFeedback(id: number, helpful: boolean) {
    const previous = advisories
    setAdvisories((current) =>
      current.map((item) => (item.id === id ? { ...item, feedback_helpful: helpful ? 1 : 0 } : item))
    )
    try {
      await submitFeedback(id, helpful)
    } catch {
      setAdvisories(previous)
      setError("Failed to save feedback. Please try again.")
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-border bg-muted-soft px-3 py-2 text-xs text-muted-foreground">
        {error ?? "Advisories update automatically."}
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading advisories...</p>}

      {!loading && visible.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-6 text-sm">
          <p className="font-semibold">No advisories yet</p>
          <p className="mt-1 text-muted-foreground">
            Run the agent to receive the latest advisories for the selected province.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {visible.map((advisory) => (
          <AdvisoryCard key={advisory.id} advisory={advisory} onFeedback={handleFeedback} />
        ))}
      </div>
    </section>
  )
}
