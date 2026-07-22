"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  advisorySocketUrl,
  type AdvisoryApi,
  type ConnectionState,
  listAdvisories,
  type ProvinceFilter,
  submitFeedback,
} from "@/lib/api"

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

export function useAdvisoryFeed(province: ProvinceFilter) {
  const [advisories, setAdvisories] = useState<AdvisoryApi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connection, setConnection] = useState<ConnectionState>("connecting")

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
    setConnection("polling")
    pollRef.current = window.setInterval(() => {
      void fetchSnapshot()
    }, 25000)
  }, [fetchSnapshot])

  const connect = useCallback(() => {
    if (!mountedRef.current) return
    setConnection(attemptsRef.current === 0 ? "connecting" : "reconnecting")

    const ws = new WebSocket(advisorySocketUrl())
    wsRef.current = ws

    ws.onopen = () => {
      attemptsRef.current = 0
      setConnection("connected")
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
      setConnection("disconnected")
      const wait = Math.min(15000, 1000 * attemptsRef.current)
      reconnectRef.current = window.setTimeout(() => connectRef.current(), wait)
    }
  }, [province, startPolling])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    mountedRef.current = true
    clearTimers()

    const initTimer = window.setTimeout(() => {
      connect()
      void fetchSnapshot()
        .catch(() => {
          setError("Failed to load initial advisories from server.")
        })
        .finally(() => {
          if (mountedRef.current) setLoading(false)
        })
    }, 0)

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

  return { advisories: visible, loading, error, connection, handleFeedback }
}
