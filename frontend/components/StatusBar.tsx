"use client"

import { Button } from "@/components/ui/button"
import type { ConnectionState, ProvinceFilter } from "@/lib/api"

const PROVINCES: ProvinceFilter[] = [
  "ALL",
  "Jawa Barat",
  "Jawa Tengah",
  "Jawa Timur",
  "Sulawesi Selatan",
  "Sumatera Utara",
]

type StatusBarProps = {
  selectedProvince: ProvinceFilter
  onProvinceChange: (value: ProvinceFilter) => void
  onRunAgent: () => void
  isRunning: boolean
  lastRunText: string
  provinceCount: number
  advisoryCount: number
  connection: ConnectionState
}

const CONNECTION_LABEL: Record<ConnectionState, string> = {
  connecting: "Connecting",
  connected: "Connected",
  reconnecting: "Reconnecting",
  polling: "Polling fallback",
  disconnected: "Disconnected",
}

export function StatusBar({
  selectedProvince,
  onProvinceChange,
  onRunAgent,
  isRunning,
  lastRunText,
  provinceCount,
  advisoryCount,
  connection,
}: StatusBarProps) {
  return (
    <aside className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-base font-semibold">Agent Controls</h2>

      <div className="mt-4 space-y-3 text-sm">
        <label htmlFor="province" className="block font-medium">
          Select Province
        </label>
        <select
          id="province"
          value={selectedProvince}
          onChange={(event) => onProvinceChange(event.target.value as ProvinceFilter)}
          className="w-full rounded-md border border-border bg-background px-3 py-2"
        >
          {PROVINCES.map((province) => (
            <option key={province} value={province}>
              {province === "ALL" ? "All Provinces" : province}
            </option>
          ))}
        </select>
      </div>

      <Button className="mt-4 w-full" onClick={onRunAgent} disabled={isRunning}>
        {isRunning ? "Running..." : "Run Agent"}
      </Button>

      <dl className="mt-5 space-y-3 text-sm">
        <div className="rounded-md border border-border bg-muted-soft p-3">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Connection</dt>
          <dd className="mt-1 font-medium">{CONNECTION_LABEL[connection]}</dd>
        </div>
        <div className="rounded-md border border-border bg-muted-soft p-3">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Last Run</dt>
          <dd className="mt-1 font-medium">{lastRunText}</dd>
        </div>
        <div className="rounded-md border border-border bg-muted-soft p-3">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Monitored Provinces</dt>
          <dd className="mt-1 font-medium">{provinceCount}</dd>
        </div>
        <div className="rounded-md border border-border bg-muted-soft p-3">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Active Advisories</dt>
          <dd className="mt-1 font-medium">{advisoryCount}</dd>
        </div>
      </dl>
    </aside>
  )
}
