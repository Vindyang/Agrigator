"use client"

import { useEffect, useState } from "react"
import { PageHeader, Panel } from "@/components/ui-kit"
import { fetchNews, type NewsItemApi } from "@/lib/api"

const CAT_COLOR: Record<string, string> = {
  Policy: "text-paddy border-paddy/40 bg-paddy/[0.06]",
  Market: "text-turmeric border-turmeric/40 bg-turmeric/[0.06]",
  Weather: "text-dusk border-dusk/40 bg-dusk/[0.06]",
  Research: "text-ink border-hairline bg-paper-2",
  Cooperative: "text-clay border-clay/40 bg-clay/[0.06]",
}

const FALLBACK_CAT_COLOR = "text-ink-2 border-hairline bg-paper-2"

function catColor(category: string): string {
  return CAT_COLOR[category] ?? FALLBACK_CAT_COLOR
}

function timeAgo(publishedAt: string | null): string {
  if (!publishedAt) return "Unknown"
  const now = Date.now()
  const then = new Date(publishedAt).getTime()
  const diffMs = now - then
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffHrs < 1) return "Just now"
  if (diffHrs < 24) return `${diffHrs} hr${diffHrs > 1 ? "s" : ""} ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  return new Date(publishedAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItemApi[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchNews()
      .then((data) => {
        if (!cancelled) setNews(data)
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load news")
      })
    return () => {
      cancelled = true
    }
  }, [])

  // --- loading state ---
  if (news === null && error === null) {
    return (
      <>
        <PageHeader
          eyebrow="Farm Tools"
          title="News Feed"
          subtitle="Policy, market, weather, and research updates from vetted sources."
        />
        <div className="p-8 text-sm text-ink-2">Loading news…</div>
      </>
    )
  }

  // --- error state ---
  if (error) {
    return (
      <>
        <PageHeader
          eyebrow="Farm Tools"
          title="News Feed"
          subtitle="Policy, market, weather, and research updates from vetted sources."
        />
        <div className="p-8">
          <Panel>
            <div className="p-8 text-center">
              <p className="font-semibold text-clay">Could not load news</p>
              <p className="mt-1 text-sm text-ink-2">{error}</p>
            </div>
          </Panel>
        </div>
      </>
    )
  }

  // --- empty state ---
  if (news!.length === 0) {
    return (
      <>
        <PageHeader
          eyebrow="Farm Tools"
          title="News Feed"
          subtitle="Policy, market, weather, and research updates from vetted sources."
        />
        <div className="p-8">
          <Panel>
            <div className="p-8 text-center text-sm text-ink-2">
              No news articles available.
            </div>
          </Panel>
        </div>
      </>
    )
  }

  // --- data ---
  const featured = news![0]
  const rest = news!.slice(1)

  return (
    <>
      <PageHeader
        eyebrow="Farm Tools"
        title="News Feed"
        subtitle="Policy, market, weather, and research updates from vetted sources."
      />

      <div className="grid grid-cols-[1.4fr_1fr] gap-6 p-8">
        <Panel>
          <article className="p-8">
            <div className="mb-4 flex items-center gap-3">
              <span
                className={
                  "inline-block border px-2 py-0.5 text-[10px] font-semibold tracking-widest uppercase " +
                  catColor(featured.category)
                }
              >
                {featured.category}
              </span>
              <span className="tabular text-[10px] tracking-widest text-ink-2 uppercase">
                {featured.source} · {timeAgo(featured.published_at)}
              </span>
            </div>
            <a
              href={featured.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-display text-3xl leading-tight font-semibold tracking-tight text-balance transition-colors hover:text-paddy"
            >
              {featured.title}
            </a>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-2">
              {featured.snippet}
            </p>
          </article>
        </Panel>

        <div className="space-y-4">
          {rest.map((n, i) => (
            <Panel key={n.url || i}>
              <article className="p-5">
                <div className="mb-2 flex items-center gap-3">
                  <span
                    className={
                      "inline-block border px-1.5 py-0.5 text-[10px] font-semibold tracking-widest uppercase " +
                      catColor(n.category)
                    }
                  >
                    {n.category}
                  </span>
                  <span className="tabular text-[10px] tracking-widest text-ink-2 uppercase">
                    {n.source}
                  </span>
                  <span className="tabular ml-auto text-[10px] text-ink-2">
                    {timeAgo(n.published_at)}
                  </span>
                </div>
                <a
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-display text-base leading-tight font-semibold transition-colors hover:text-paddy"
                >
                  {n.title}
                </a>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-2">
                  {n.snippet}
                </p>
              </article>
            </Panel>
          ))}
        </div>
      </div>
    </>
  )
}
