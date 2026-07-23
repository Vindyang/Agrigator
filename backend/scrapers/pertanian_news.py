"""
Kementan (Ministry of Agriculture) news scraper.

Primary:    httpx + BeautifulSoup on pertanian.go.id (fast, official source)
Supplement: Google News RSS for broader agricultural news from across the web
            (runs in parallel, adds context from media like Kompas, Katadata, etc.)

Return shape: [{"title": str, "url": str, "snippet": str, "published_at": str | None}]
"""

import asyncio
import html
import logging
import re

import httpx
from bs4 import BeautifulSoup


logger = logging.getLogger(__name__)

PERTANIAN_NEWS_URL = "https://www.pertanian.go.id/?show=news&act=view_all&cat=2"
PERTANIAN_BASE_URL = "https://www.pertanian.go.id"

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
}

_DATE_RE = re.compile(r"\d{2}[/-]\d{2}[/-]\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+\w+\s+\d{4}")


def _resolve_url(href: str) -> str:
    if href.startswith("http"):
        return href
    if href.startswith("/"):
        return PERTANIAN_BASE_URL + href
    return PERTANIAN_BASE_URL + "/" + href


def _parse_html(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    seen: set[str] = set()
    articles: list[dict] = []

    for a in soup.find_all("a", href=True):
        href: str = a["href"]
        if "show=news" not in href or "act=view" not in href or "id=" not in href:
            continue

        title = a.get_text(separator=" ", strip=True)
        if not title:
            continue

        url = _resolve_url(href)
        if url in seen:
            continue
        seen.add(url)

        grandparent = a.parent.parent if a.parent and a.parent.parent else None
        if grandparent:
            full_text = grandparent.get_text(separator=" ", strip=True)
            snippet = full_text.replace(title, "").strip()[:300]
        else:
            snippet = ""

        date_match = _DATE_RE.search(snippet)
        articles.append({
            "title": title,
            "url": url,
            "snippet": snippet,
            "published_at": date_match.group(0) if date_match else None,
            "source": "pertanian.go.id",
        })

        if len(articles) >= 20:
            break

    return articles


def _filter(articles: list[dict], query: str) -> list[dict]:
    if not query:
        return articles
    keywords = query.lower().split()
    return [
        a for a in articles
        if any(kw in (a["title"] + a["snippet"]).lower() for kw in keywords)
    ]


# ---------------------------------------------------------------------------
# Google News RSS — broader agricultural news search
# ---------------------------------------------------------------------------

_GNEWS_RSS = (
    "https://news.google.com/rss/search"
    "?q=pertanian+pangan+harga+indonesia"
    "&hl=id&gl=ID&ceid=ID:id"
)
_ITEM_RE = re.compile(r"<item>(.*?)</item>", re.DOTALL)
_TAG_RE = re.compile(r"<(\w+)>(.*?)</\1>", re.DOTALL)
_HREF_RE = re.compile(r'href="(https?://[^"]+)"')


def _clean_cdata(s: str) -> str:
    return s.replace("<![CDATA[", "").replace("]]>", "").strip()


def _parse_rss_items(xml: str) -> list[dict]:
    articles: list[dict] = []
    for item_match in _ITEM_RE.finditer(xml):
        item = item_match.group(1)
        fields: dict[str, str] = {}
        for tag_match in _TAG_RE.finditer(item):
            fields[tag_match.group(1)] = tag_match.group(2).strip()

        # Title: strip CDATA and source attribution (" - Source Name" suffix)
        raw_title = _clean_cdata(fields.get("title", ""))
        title = re.sub(r"\s+-\s+[^-]+$", "", raw_title).strip()
        source_name = re.search(r"\s+-\s+(.+)$", raw_title)
        source = source_name.group(1).strip() if source_name else "Google News"
        if not title:
            continue

        # URL: decode HTML entities in description to get the real article href
        desc_raw = html.unescape(fields.get("description", ""))
        href_match = _HREF_RE.search(desc_raw)
        url = href_match.group(1) if href_match else ""
        # Fall back to Google redirect link if no direct URL found
        if not url:
            url = _clean_cdata(fields.get("link", ""))

        pub = _clean_cdata(fields.get("pubDate", ""))

        articles.append({
            "title": title,
            "url": url,
            "snippet": "",  # Google News RSS doesn't include article text
            "published_at": pub or None,
            "source": source,
        })
        if len(articles) >= 10:
            break
    return articles


async def _scrape_gnews_rss() -> list[dict]:
    """Fetch Google News RSS for Indonesian agriculture/food price news."""
    try:
        async with httpx.AsyncClient(timeout=15.0, headers=_HEADERS, follow_redirects=True) as client:
            r = await client.get(_GNEWS_RSS)
            r.raise_for_status()
    except Exception as exc:
        logger.warning("Google News RSS fetch failed: %s", exc)
        return []

    articles = _parse_rss_items(r.text)
    logger.info("Google News RSS: %d articles", len(articles))
    return articles


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

async def scrape_pertanian_news(query: str = "") -> list[dict]:
    """
    Fetch agricultural news articles.

    Runs httpx+BeautifulSoup (pertanian.go.id) and Google News RSS in parallel.
    Results are combined and deduplicated by URL.
    Returns [] on total failure — agent loop must tolerate missing news context.
    """
    official_task = asyncio.create_task(_scrape_official(query))
    web_task = asyncio.create_task(_scrape_gnews_rss())

    official, web = await asyncio.gather(official_task, web_task, return_exceptions=True)

    seen_urls: set[str] = set()
    combined: list[dict] = []

    for batch in (official, web):
        if not isinstance(batch, list):
            continue
        for article in batch:
            url = article.get("url", "")
            if url and url not in seen_urls:
                seen_urls.add(url)
                combined.append(article)

    logger.info(
        "Pertanian news total: %d articles (%d official, %d gnews)",
        len(combined),
        len(official) if isinstance(official, list) else 0,
        len(web) if isinstance(web, list) else 0,
    )
    return combined


async def _scrape_official(query: str) -> list[dict]:
    """Fetch and parse pertanian.go.id news page."""
    try:
        async with httpx.AsyncClient(timeout=15.0, headers=_HEADERS, follow_redirects=True) as client:
            response = await client.get(PERTANIAN_NEWS_URL)
            response.raise_for_status()
        articles = _parse_html(response.text)
        logger.info("Pertanian official: %d articles", len(articles))
        return _filter(articles, query)
    except Exception as exc:
        logger.warning("Pertanian official fetch failed: %s", exc)
        return []
