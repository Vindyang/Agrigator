import { Delta, PageHeader, Panel, Sparkline } from "@/components/ui-kit"

type Row = {
  crop: string
  market: string
  price: number
  delta: number
  unit: string
  trend: number[]
}

const PRICES: Row[] = [
  { crop: "Bird's-Eye Chili", market: "Kramat Jati", price: 74500, delta: 12, unit: "kg", trend: [66, 68, 70, 71, 72, 73, 74.5] },
  { crop: "Red Onion", market: "Kramat Jati", price: 32000, delta: -2, unit: "kg", trend: [33, 33, 32.5, 32.4, 32.2, 32, 32] },
  { crop: "Pipil Corn", market: "Malang Wholesale", price: 8200, delta: 0, unit: "kg", trend: [8.1, 8.2, 8.2, 8.1, 8.2, 8.2, 8.2] },
  { crop: "GKG Paddy", market: "Nasional Bulog", price: 7200, delta: 6, unit: "kg", trend: [6.8, 6.9, 6.9, 7.0, 7.1, 7.1, 7.2] },
  { crop: "Arabica Coffee", market: "ICE + broker", price: 82000, delta: 15, unit: "kg", trend: [70, 72, 75, 77, 79, 80, 82] },
  { crop: "Shallot", market: "Kramat Jati", price: 28500, delta: -14, unit: "kg", trend: [33, 32, 31, 30, 29, 28.7, 28.5] },
  { crop: "Cassava", market: "Malang Wholesale", price: 3400, delta: 3, unit: "kg", trend: [3.3, 3.3, 3.3, 3.35, 3.35, 3.4, 3.4] },
  { crop: "Robusta Coffee", market: "ICE + broker", price: 46000, delta: 8, unit: "kg", trend: [42, 43, 43, 44, 45, 45, 46] },
]

const fmt = new Intl.NumberFormat("id-ID")

export default function PricesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Farm Tools"
        title="Wholesale Prices"
        subtitle="Daily settled prices from regional and national wholesale markets, per kilogram in IDR."
        right={
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-ink-2">Feed</p>
            <p className="text-xs font-semibold tabular">Updated 08:00 WIB</p>
          </div>
        }
      />

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-3 border border-hairline">
          <BigPrice label="Best mover" crop="Arabica Coffee" price={82000} delta={15} color="text-turmeric" />
          <BigPrice label="Sharpest drop" crop="Shallot" price={28500} delta={-14} color="text-clay" />
          <BigPrice label="Most watched" crop="Bird's-Eye Chili" price={74500} delta={12} color="text-turmeric" />
        </div>

        <Panel title="All commodities" meta={`${PRICES.length} listed`}>
          <table className="w-full text-sm">
            <thead className="border-b border-hairline">
              <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-2">
                <th className="px-4 py-3">Commodity</th>
                <th className="px-4 py-3">Market</th>
                <th className="px-4 py-3 text-right">Price (IDR/kg)</th>
                <th className="px-4 py-3 text-right">7d change</th>
                <th className="px-4 py-3">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {PRICES.map((r) => (
                <tr key={r.crop} className="hover:bg-paper-2">
                  <td className="px-4 py-3 font-semibold">{r.crop}</td>
                  <td className="px-4 py-3 text-ink-2 text-xs uppercase tracking-wider">{r.market}</td>
                  <td className="px-4 py-3 text-right font-display font-semibold text-lg tabular">
                    {fmt.format(r.price)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Delta value={r.delta} unit="%" />
                  </td>
                  <td className="px-4 py-3 w-32">
                    <span
                      className={
                        r.delta > 0 ? "text-turmeric" : r.delta < 0 ? "text-clay" : "text-ink-2"
                      }
                    >
                      <Sparkline data={r.trend} width={90} height={22} />
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

function BigPrice({
  label,
  crop,
  price,
  delta,
  color,
}: {
  label: string
  crop: string
  price: number
  delta: number
  color: string
}) {
  return (
    <div className="px-8 py-6 border-r border-hairline last:border-r-0">
      <p className={"text-[10px] font-semibold uppercase tracking-[0.2em] " + color}>{label}</p>
      <p className="mt-1 text-sm font-semibold">{crop}</p>
      <div className="flex items-baseline gap-2 mt-3">
        <span className="text-xs text-ink-2 uppercase tracking-wider">Rp</span>
        <span className="font-display text-4xl font-semibold tabular leading-none">
          {fmt.format(price)}
        </span>
      </div>
      <p className="mt-2 text-xs">
        <Delta value={delta} unit="%" />
        <span className="text-ink-2 ml-1">this week</span>
      </p>
    </div>
  )
}
