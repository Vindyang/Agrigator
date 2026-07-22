import { PageHeader, Panel, Sparkline } from "@/components/ui-kit"

const DAYS = [
  { d: "Mon", hi: 32, lo: 22, rain: 5, icon: "☀" },
  { d: "Tue", hi: 30, lo: 23, rain: 25, icon: "☁" },
  { d: "Wed", hi: 27, lo: 22, rain: 65, icon: "☂" },
  { d: "Thu", hi: 28, lo: 22, rain: 45, icon: "☂" },
  { d: "Fri", hi: 31, lo: 23, rain: 10, icon: "☁" },
  { d: "Sat", hi: 33, lo: 24, rain: 0, icon: "☀" },
  { d: "Sun", hi: 33, lo: 24, rain: 2, icon: "☀" },
]

const STATIONS = [
  { id: "ST-04B", name: "Turirejo Field", temp: 29.4, hum: 78, rain24: 12.4, status: "OK" },
  { id: "ST-07A", name: "Sidodadi Ridge", temp: 27.8, hum: 84, rain24: 22.1, status: "OK" },
  { id: "ST-11C", name: "Mulyoasri Basin", temp: 30.2, hum: 71, rain24: 4.2, status: "OK" },
  { id: "ST-02D", name: "Bromo Slope", temp: 24.6, hum: 88, rain24: 38.6, status: "Alert" },
]

export default function WeatherPage() {
  const maxRain = Math.max(...DAYS.map((d) => d.rain))
  return (
    <>
      <PageHeader
        eyebrow="Monitoring"
        title="Weather Reports"
        subtitle="Regional forecast, rainfall accumulation, and live station readings."
        right={
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-ink-2">Source</p>
            <p className="text-xs font-semibold tabular">BMKG + 4 field stations</p>
          </div>
        }
      />

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-[1.2fr_1fr_1fr] border border-hairline">
          <div className="p-8 border-r border-hairline">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-2">Now — Jawa Timur</p>
            <div className="flex items-baseline gap-3 mt-3">
              <span className="font-display text-7xl font-semibold tabular leading-none">29</span>
              <span className="font-display text-3xl font-medium text-ink-2">°C</span>
            </div>
            <p className="mt-3 font-display text-lg font-semibold">Partly cloudy</p>
            <p className="text-sm text-ink-2 mt-1">Humidity 76% · Wind 10 km/h · Feels like 32°C</p>
          </div>
          <StatBlock label="Rainfall (24h)" value="18.4" unit="mm" color="text-dusk" />
          <StatBlock label="Growing degree days" value="21.6" unit="GDD" color="text-paddy" />
        </div>

        <Panel title="7-Day Forecast" meta="Updated 09:42 WIB">
          <div className="grid grid-cols-7">
            {DAYS.map((day, i) => (
              <div key={day.d} className={"p-5 flex flex-col items-center gap-3 " + (i < 6 ? "border-r border-hairline" : "")}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-2">{day.d}</p>
                <p className="text-2xl leading-none text-dusk">{day.icon}</p>
                <div className="text-center">
                  <p className="font-display text-xl font-semibold tabular">{day.hi}°</p>
                  <p className="text-xs text-ink-2 tabular">{day.lo}°</p>
                </div>
                <div className="w-full flex flex-col items-center gap-1">
                  <div className="w-6 h-16 bg-dusk/10 relative">
                    <div className="absolute bottom-0 w-full bg-dusk" style={{ height: `${(day.rain / maxRain) * 100}%` }} />
                  </div>
                  <p className="text-[10px] tabular text-dusk font-semibold">{day.rain}mm</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid grid-cols-2 gap-6">
          <Panel title="Temperature Trend (14d)">
            <div className="p-6 text-dusk">
              <Sparkline data={[26, 27, 28, 27, 29, 30, 28, 27, 29, 30, 31, 30, 29, 29]} width={500} height={120} />
              <div className="mt-3 flex justify-between text-[10px] text-ink-2 tabular uppercase tracking-wider">
                <span>2 wks ago</span>
                <span>Today</span>
              </div>
            </div>
          </Panel>
          <Panel title="Rainfall Trend (14d)">
            <div className="p-6 text-paddy">
              <Sparkline data={[2, 0, 8, 12, 4, 0, 6, 22, 18, 5, 32, 45, 20, 18]} width={500} height={120} />
              <div className="mt-3 flex justify-between text-[10px] text-ink-2 tabular uppercase tracking-wider">
                <span>2 wks ago</span>
                <span>Today</span>
              </div>
            </div>
          </Panel>
        </div>

        <Panel title="Field Stations" meta={`${STATIONS.length} online`}>
          <table className="w-full text-sm">
            <thead className="border-b border-hairline">
              <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-2">
                <th className="px-4 py-3 font-semibold">Station</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold text-right">Temp °C</th>
                <th className="px-4 py-3 font-semibold text-right">Humidity</th>
                <th className="px-4 py-3 font-semibold text-right">Rain 24h</th>
                <th className="px-4 py-3 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline tabular">
              {STATIONS.map((s) => (
                <tr key={s.id} className="hover:bg-paper-2">
                  <td className="px-4 py-3 font-mono text-xs">{s.id}</td>
                  <td className="px-4 py-3">{s.name}</td>
                  <td className="px-4 py-3 text-right">{s.temp.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right">{s.hum}%</td>
                  <td className="px-4 py-3 text-right">{s.rain24.toFixed(1)} mm</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={
                        "inline-block px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border " +
                        (s.status === "Alert" ? "text-clay border-clay/40 bg-clay/[0.06]" : "text-paddy border-paddy/40 bg-paddy/[0.06]")
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

function StatBlock({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="p-8 border-r border-hairline last:border-r-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-2">{label}</p>
      <div className="flex items-baseline gap-2 mt-3">
        <span className={"font-display text-5xl font-semibold tabular leading-none " + color}>{value}</span>
        <span className="text-sm text-ink-2 uppercase tracking-wider">{unit}</span>
      </div>
    </div>
  )
}
