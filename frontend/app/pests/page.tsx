"use client"

import { PageHeader, Panel, SignalPill, Sparkline, useDensity } from "@/components/ui-kit"

type Alert = {
  id: string
  crop: string
  pest: string
  risk: number
  signal: "urgent" | "monitor" | "opportunity"
  region: string
  recommendation: string
  confidence: number
  updated: string
  trend: number[]
}

const ALERTS: Alert[] = [
  { id: "P-0092", crop: "Shallot", pest: "Fusarium wilt", risk: 82, signal: "urgent", region: "Turirejo", recommendation: "Systemic fungicide + drainage", confidence: 94, updated: "12 min", trend: [30, 40, 55, 63, 72, 78, 82] },
  { id: "P-0088", crop: "Bird's-Eye Chili", pest: "Anthracnose", risk: 71, signal: "urgent", region: "Sidodadi", recommendation: "Copper-based spray, remove infected fruit", confidence: 88, updated: "40 min", trend: [40, 44, 50, 55, 62, 68, 71] },
  { id: "P-0086", crop: "Paddy", pest: "Brown planthopper", risk: 48, signal: "monitor", region: "Sub-basin 04", recommendation: "Scout weekly; hold treatment", confidence: 82, updated: "2 hrs", trend: [22, 26, 30, 35, 42, 46, 48] },
  { id: "P-0084", crop: "Sweet Corn", pest: "Fall armyworm", risk: 32, signal: "monitor", region: "Mulyoasri", recommendation: "Maintain pheromone traps", confidence: 79, updated: "3 hrs", trend: [12, 14, 18, 22, 26, 30, 32] },
  { id: "P-0079", crop: "Coffee", pest: "Berry borer", risk: 24, signal: "monitor", region: "Bromo slope", recommendation: "Sanitation harvest of fallen cherries", confidence: 76, updated: "6 hrs", trend: [10, 12, 14, 16, 20, 22, 24] },
  { id: "P-0071", crop: "Red Onion", pest: "Thrips", risk: 12, signal: "monitor", region: "Turirejo", recommendation: "Population stable", confidence: 84, updated: "1 day", trend: [10, 11, 12, 13, 12, 11, 12] },
]

function riskBar(risk: number) {
  if (risk >= 70) return "bg-clay"
  if (risk >= 40) return "bg-dusk"
  return "bg-paddy"
}

export default function PestsPage() {
  const { density } = useDensity()
  const dense = density === "officer"
  const urgent = ALERTS.filter((a) => a.signal === "urgent").length
  const monitor = ALERTS.filter((a) => a.signal === "monitor").length

  return (
    <>
      <PageHeader
        eyebrow="Monitoring"
        title="Pest Alerts"
        subtitle="Active pest and disease risks across all monitored plots, ranked by severity."
      />

      <div className="grid grid-cols-4 border-b border-hairline">
        <Kpi label="Urgent" value={urgent} color="text-clay" />
        <Kpi label="Monitor" value={monitor} color="text-dusk" />
        <Kpi label="Plots at risk" value={12} color="text-ink" />
        <Kpi label="Avg. confidence" value="86%" color="text-ink" isText />
      </div>

      <div className="p-8 space-y-8">
        <Panel title="Active alerts" meta={`${ALERTS.length} total`}>
          <table className="w-full text-sm">
            <thead className="border-b border-hairline">
              <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-2">
                <th className="px-4 py-3">Signal</th>
                <th className="px-4 py-3">Crop</th>
                <th className="px-4 py-3">Pest / Disease</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Trend</th>
                <th className="px-4 py-3">Recommendation</th>
                {dense && <th className="px-4 py-3 text-right">Conf.</th>}
                {dense && <th className="px-4 py-3 text-right">Region</th>}
                {dense && <th className="px-4 py-3 text-right">Updated</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {ALERTS.map((a) => (
                <tr key={a.id} className="hover:bg-paper-2">
                  <td className="px-4 py-3">
                    <SignalPill kind={a.signal} />
                  </td>
                  <td className="px-4 py-3 font-semibold">{a.crop}</td>
                  <td className="px-4 py-3">{a.pest}</td>
                  <td className="px-4 py-3 w-48">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-hairline">
                        <div className={"h-full " + riskBar(a.risk)} style={{ width: `${a.risk}%` }} />
                      </div>
                      <span className="tabular font-semibold text-xs w-8 text-right">{a.risk}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-2">
                    <Sparkline data={a.trend} width={90} height={20} />
                  </td>
                  <td className="px-4 py-3 text-ink-2">{a.recommendation}</td>
                  {dense && <td className="px-4 py-3 text-right tabular font-semibold">{a.confidence}%</td>}
                  {dense && <td className="px-4 py-3 text-right text-xs">{a.region}</td>}
                  {dense && <td className="px-4 py-3 text-right text-xs tabular text-ink-2">{a.updated}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </>
  )
}

function Kpi({ label, value, color, isText }: { label: string; value: number | string; color: string; isText?: boolean }) {
  return (
    <div className="px-8 py-6 border-r border-hairline last:border-r-0">
      <p className={"text-[10px] font-semibold uppercase tracking-[0.2em] " + color}>{label}</p>
      <p className={"font-display text-4xl font-semibold tabular mt-2 " + color}>
        {isText ? value : String(value).padStart(2, "0")}
      </p>
    </div>
  )
}
