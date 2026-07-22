import { PageHeader, Panel } from "@/components/ui-kit"

type Item = {
  id: string
  category: "Policy" | "Market" | "Weather" | "Research" | "Cooperative"
  source: string
  title: string
  summary: string
  time: string
  featured?: boolean
}

const NEWS: Item[] = [
  { id: "n1", category: "Policy", source: "Ministry of Agriculture", title: "Fertilizer subsidy allocation expanded for smallholder rice growers", summary: "New allocation targets plots under 2 ha in East Java, effective for the upcoming wet season. Registration through cooperative offices opens next week.", time: "2 hrs ago", featured: true },
  { id: "n2", category: "Market", source: "Kramat Jati Wholesale", title: "Chili prices climb 12% amid tighter regional supply", summary: "Weekly settled prices for bird's-eye chili rose to Rp 74,500/kg on lower arrivals from West Java.", time: "4 hrs ago" },
  { id: "n3", category: "Weather", source: "BMKG", title: "Above-average rainfall forecast for East Java region through October", summary: "Regional forecast points to a wetter-than-normal transition period. Growers advised to plan drainage now.", time: "6 hrs ago" },
  { id: "n4", category: "Research", source: "IPB University", title: "Trial shows resistant shallot line halves Fusarium incidence", summary: "A three-season trial across four cooperatives reports significant reduction in wilt at comparable yield.", time: "Yesterday" },
  { id: "n5", category: "Cooperative", source: "Koperasi Tani Makmur", title: "3-month forward contract offered on red onion at Rp 34,000/kg", summary: "Contract window open through the end of the month for cooperative members.", time: "Yesterday" },
  { id: "n6", category: "Market", source: "ICE + broker feed", title: "Arabica futures firm on European buyer demand for grade G1", summary: "Broker-reported physical premium widens; consolidation of warehouse stock recommended by cooperative desk.", time: "2 days ago" },
]

const CAT_COLOR: Record<Item["category"], string> = {
  Policy: "text-paddy border-paddy/40 bg-paddy/[0.06]",
  Market: "text-turmeric border-turmeric/40 bg-turmeric/[0.06]",
  Weather: "text-dusk border-dusk/40 bg-dusk/[0.06]",
  Research: "text-ink border-hairline bg-paper-2",
  Cooperative: "text-clay border-clay/40 bg-clay/[0.06]",
}

export default function NewsPage() {
  const featured = NEWS.find((n) => n.featured)!
  const rest = NEWS.filter((n) => !n.featured)

  return (
    <>
      <PageHeader
        eyebrow="Farm Tools"
        title="News Feed"
        subtitle="Policy, market, weather, and research updates from vetted sources."
      />

      <div className="p-8 grid grid-cols-[1.4fr_1fr] gap-6">
        <Panel>
          <article className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className={"inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest border " + CAT_COLOR[featured.category]}>
                {featured.category}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-ink-2 tabular">
                {featured.source} · {featured.time}
              </span>
            </div>
            <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight text-balance">
              {featured.title}
            </h2>
            <p className="mt-4 text-base text-ink-2 leading-relaxed max-w-2xl">{featured.summary}</p>
          </article>
        </Panel>

        <div className="space-y-4">
          {rest.map((n) => (
            <Panel key={n.id}>
              <article className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className={"inline-block px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest border " + CAT_COLOR[n.category]}>
                    {n.category}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-ink-2 tabular">{n.source}</span>
                  <span className="ml-auto text-[10px] tabular text-ink-2">{n.time}</span>
                </div>
                <h3 className="font-display text-base font-semibold leading-tight">{n.title}</h3>
                <p className="mt-1.5 text-xs text-ink-2 leading-relaxed">{n.summary}</p>
              </article>
            </Panel>
          ))}
        </div>
      </div>
    </>
  )
}
