"use client"

import { createContext, useContext, useState } from "react"

import { SidebarTrigger } from "@/components/ui/sidebar"

type Density = "farmer" | "officer"

const DensityContext = createContext<{
  density: Density
  setDensity: (value: Density) => void
}>({
  density: "officer",
  setDensity: () => {},
})

export function DensityProvider({ children }: { children: React.ReactNode }) {
  const [density, setDensity] = useState<Density>("officer")
  return (
    <DensityContext.Provider value={{ density, setDensity }}>{children}</DensityContext.Provider>
  )
}

export function useDensity() {
  return useContext(DensityContext)
}

export function DensityToggle() {
  const { density, setDensity } = useDensity()
  return (
    <div className="inline-flex border border-hairline" role="group" aria-label="Density">
      {(["farmer", "officer"] as const).map((value) => {
        const active = density === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => setDensity(value)}
            aria-pressed={active}
            className={
              "px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] transition-colors " +
              (active ? "bg-paddy text-paper" : "bg-paper text-ink-2 hover:text-ink")
            }
          >
            {value === "farmer" ? "Farmer" : "Officer"}
          </button>
        )
      })}
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  right?: React.ReactNode
}) {
  return (
    <header className="flex items-end justify-between gap-6 border-b border-hairline px-8 py-6">
      <div className="flex items-start gap-3">
        <SidebarTrigger className="mt-1 md:hidden" />
        <div>
          {eyebrow && (
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-2">
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-3xl font-semibold leading-none tracking-tight">
            {title}
          </h1>
          {subtitle && <p className="mt-2 max-w-2xl text-sm text-ink-2">{subtitle}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        {right}
        <DensityToggle />
      </div>
    </header>
  )
}

export function Panel({
  title,
  meta,
  children,
  className = "",
}: {
  title?: string
  meta?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={"border border-hairline bg-paper " + className}>
      {(title || meta) && (
        <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
          {title && (
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em]">{title}</h2>
          )}
          {meta && (
            <div className="tabular text-[10px] font-medium uppercase tracking-wider text-ink-2">
              {meta}
            </div>
          )}
        </div>
      )}
      {children}
    </section>
  )
}

export function SignalPill({ kind }: { kind: "urgent" | "monitor" | "opportunity" }) {
  const map = {
    urgent: { c: "text-clay border-clay/40 bg-clay/[0.06]", label: "Urgent Action" },
    monitor: { c: "text-dusk border-dusk/40 bg-dusk/[0.06]", label: "Monitor" },
    opportunity: { c: "text-turmeric border-turmeric/40 bg-turmeric/[0.06]", label: "Opportunity" },
  }[kind]
  return (
    <span
      className={
        "inline-flex items-center border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest " +
        map.c
      }
    >
      {map.label}
    </span>
  )
}

export function Delta({ value, unit }: { value: number; unit?: string }) {
  const sign = value > 0 ? "+" : ""
  const color = value > 0 ? "text-turmeric" : value < 0 ? "text-clay" : "text-ink-2"
  return (
    <span className={"tabular font-semibold " + color}>
      {sign}
      {value}
      {unit ?? ""}
    </span>
  )
}

export function Sparkline({
  data,
  color = "currentColor",
  height = 32,
  width = 120,
}: {
  data: number[]
  color?: string
  height?: number
  width?: number
}) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const step = width / (data.length - 1)
  const points = data
    .map(
      (value, index) =>
        `${(index * step).toFixed(1)},${(height - ((value - min) / span) * height).toFixed(1)}`
    )
    .join(" ")
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.25"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
