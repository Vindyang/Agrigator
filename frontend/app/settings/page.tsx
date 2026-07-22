"use client"

import { useTheme } from "next-themes"

import { DensityToggle, PageHeader, Panel } from "@/components/ui-kit"

const THEMES = ["light", "dark", "system"] as const

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Settings"
        subtitle="Appearance and display preferences for this device."
      />

      <div className="max-w-xl space-y-8 p-8">
        <Panel title="Appearance">
          <div className="flex items-center justify-between gap-6 p-4">
            <div>
              <p className="text-sm font-semibold">Theme</p>
              <p className="mt-0.5 text-xs text-ink-2">
                Switch between light, dark, or match your system.
              </p>
            </div>
            <div className="inline-flex border border-hairline" role="group" aria-label="Theme">
              {THEMES.map((value) => {
                const active = theme === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value)}
                    aria-pressed={active}
                    className={
                      "px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] capitalize transition-colors " +
                      (active ? "bg-paddy text-paper" : "bg-paper text-ink-2 hover:text-ink")
                    }
                  >
                    {value}
                  </button>
                )
              })}
            </div>
          </div>
        </Panel>

        <Panel title="Display density">
          <div className="flex items-center justify-between gap-6 p-4">
            <div>
              <p className="text-sm font-semibold">Farmer / Officer</p>
              <p className="mt-0.5 text-xs text-ink-2">
                Officer mode shows extra technical detail (confidence, region, timestamps) on the
                Dashboard and Pest Alerts.
              </p>
            </div>
            <DensityToggle />
          </div>
        </Panel>
      </div>
    </>
  )
}
