"use client"

import { useEffect, useState } from "react"
import { Delta, PageHeader, Panel, Sparkline } from "@/components/ui-kit"
import { fetchPrices, type PriceApi } from "@/lib/api"

const COMMODITY_LABEL: Record<string, string> = {
  beras: "Rice",
  gula: "Sugar",
  minyak_goreng: "Cooking Oil",
  daging_sapi: "Beef",
  daging_ayam: "Chicken",
  telur: "Eggs",
  jagung: "Corn",
  kedelai: "Soybean",
  cabai: "Chili",
  bawang_merah: "Red Onion",
}

function commodityLabel(slug: string): string {
  return (
    COMMODITY_LABEL[slug] ??
    slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  )
}

const fmt = new Intl.NumberFormat("id-ID")

export default function PricesPage() {
  const [data, setData] = useState<PriceApi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const prices = await fetchPrices(undefined, 7)
        if (!cancelled) setData(prices)
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load prices")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const bestMover =
    data.length > 0
      ? ([...data]
          .filter((p) => p.delta_pct !== null)
          .sort((a, b) => (b.delta_pct ?? 0) - (a.delta_pct ?? 0))[0] ??
        data[0])
      : null

  const sharpestDrop =
    data.length > 0
      ? ([...data]
          .filter((p) => p.delta_pct !== null)
          .sort((a, b) => (a.delta_pct ?? 0) - (b.delta_pct ?? 0))[0] ??
        data[0])
      : null

  const mostWatched =
    data.length > 0
      ? ([...data]
          .filter((p) => p.delta_pct !== null)
          .sort(
            (a, b) => Math.abs(b.delta_pct ?? 0) - Math.abs(a.delta_pct ?? 0)
          )[0] ?? data[0])
      : null

  return (
    <>
      <PageHeader
        eyebrow="Farm Tools"
        title="Wholesale Prices"
        subtitle="Daily settled prices from regional and national wholesale markets, per kilogram in IDR."
        right={
          <div className="text-right">
            <p className="text-[10px] tracking-widest text-ink-2 uppercase">
              Feed
            </p>
            <p className="tabular text-xs font-semibold">Updated 08:00 WIB</p>
          </div>
        }
      />

      <div className="space-y-8 p-8">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <p className="animate-pulse text-sm text-ink-2">Loading prices…</p>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-clay">{error}</p>
          </div>
        )}

        {!loading && !error && data.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-ink-2">No price data available.</p>
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <>
            <div className="grid grid-cols-3 border border-hairline">
              {bestMover && (
                <BigPrice
                  label="Best mover"
                  crop={commodityLabel(bestMover.commodity)}
                  price={bestMover.price}
                  delta={bestMover.delta_pct ?? 0}
                  color="text-turmeric"
                />
              )}
              {sharpestDrop && (
                <BigPrice
                  label="Sharpest drop"
                  crop={commodityLabel(sharpestDrop.commodity)}
                  price={sharpestDrop.price}
                  delta={sharpestDrop.delta_pct ?? 0}
                  color="text-clay"
                />
              )}
              {mostWatched && (
                <BigPrice
                  label="Most watched"
                  crop={commodityLabel(mostWatched.commodity)}
                  price={mostWatched.price}
                  delta={mostWatched.delta_pct ?? 0}
                  color="text-turmeric"
                />
              )}
            </div>

            <Panel title="All commodities" meta={`${data.length} listed`}>
              <table className="w-full text-sm">
                <thead className="border-b border-hairline">
                  <tr className="text-left text-[10px] font-semibold tracking-[0.15em] text-ink-2 uppercase">
                    <th className="px-4 py-3">Commodity</th>
                    <th className="px-4 py-3">Market</th>
                    <th className="px-4 py-3 text-right">Price (IDR/kg)</th>
                    <th className="px-4 py-3 text-right">7d change</th>
                    <th className="px-4 py-3">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {data.map((r) => (
                    <tr
                      key={`${r.commodity}-${r.city}`}
                      className="hover:bg-paper-2"
                    >
                      <td className="px-4 py-3 font-semibold">
                        <a
                          href={r.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-paddy hover:underline"
                        >
                          {commodityLabel(r.commodity)}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-xs tracking-wider text-ink-2 uppercase">
                        {r.city}
                      </td>
                      <td className="tabular px-4 py-3 text-right font-display text-lg font-semibold">
                        {fmt.format(r.price)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Delta value={r.delta_pct ?? 0} unit="%" />
                      </td>
                      <td className="w-32 px-4 py-3">
                        <span
                          className={
                            (r.delta_pct ?? 0) > 0
                              ? "text-turmeric"
                              : (r.delta_pct ?? 0) < 0
                                ? "text-clay"
                                : "text-ink-2"
                          }
                        >
                          <Sparkline
                            data={r.trend.map((t) => t.price)}
                            width={90}
                            height={22}
                          />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </>
        )}
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
    <div className="border-r border-hairline px-8 py-6 last:border-r-0">
      <p
        className={
          "text-[10px] font-semibold tracking-[0.2em] uppercase " + color
        }
      >
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold">{crop}</p>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-xs tracking-wider text-ink-2 uppercase">Rp</span>
        <span className="tabular font-display text-4xl leading-none font-semibold">
          {fmt.format(price)}
        </span>
      </div>
      <p className="mt-2 text-xs">
        <Delta value={delta} unit="%" />
        <span className="ml-1 text-ink-2">this week</span>
      </p>
    </div>
  )
}
