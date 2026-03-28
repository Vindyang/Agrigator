"""
Kementan (Ministry of Agriculture) news scraper.

Source: pertanian.go.id/?show=news&act=view_all&cat=2

Uses plain httpx + BeautifulSoup (~1s). The page is server-rendered HTML.

Return shape: [{"title": str, "url": str, "snippet": str, "published_at": str | None}]
"""

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
    """
    Extract news articles from page HTML.

    Article URLs follow: ?show=news&act=view&id=XXXX
    Each appears twice (image link + text link) — skip empty-title ones first.
    Snippet lives in div.media-body as text outside the h5.media-heading.
    """
    soup = BeautifulSoup(html, "html.parser")
    seen: set[str] = set()
    articles: list[dict] = []

    for a in soup.find_all("a", href=True):
        href: str = a["href"]
        if "show=news" not in href or "act=view" not in href or "id=" not in href:
            continue

        title = a.get_text(separator=" ", strip=True)
        if not title:
            continue  # image/thumbnail link — skip without adding to seen

        url = _resolve_url(href)
        if url in seen:
            continue
        seen.add(url)

        # Snippet is text in div.media-body outside the h5 heading (grandparent)
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


async def scrape_pertanian_news(query: str = "") -> list[dict]:
    """
    Fetch Kementan news articles.

    If query is provided (agent research loop), filters by keyword match.
    Returns [] on failure — agent loop must tolerate missing news context.
    """
    try:
        async with httpx.AsyncClient(timeout=15.0, headers=_HEADERS, follow_redirects=True) as client:
            response = await client.get(PERTANIAN_NEWS_URL)
            response.raise_for_status()
        articles = _parse_html(response.text)
        logger.info("Pertanian news: %d articles found", len(articles))
        return _filter(articles, query)
    except Exception as exc:
        logger.warning("Pertanian news fetch failed: %s", exc)
        return []
