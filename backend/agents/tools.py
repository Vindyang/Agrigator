from datetime import datetime, timedelta, timezone

from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.price import PriceRecord
from backend.models.alert import AlertRecord
from backend.scrapers import tinyfish_client


async def get_prices(session: AsyncSession, province: str, commodity: str, days: int = 7) -> list[dict]:
    """Fetch recent price records for a commodity/province from the DB."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await session.exec(
        select(PriceRecord)
        .where(PriceRecord.province == province)
        .where(PriceRecord.commodity == commodity)
        .where(PriceRecord.date_of_price >= since.date())
        .order_by(PriceRecord.date_of_price.desc())
    )
    records = result.all()
    return [
        {
            "id": r.id,
            "date": r.date_of_price.isoformat(),
            "price": float(r.price),
            "currency": r.currency,
            "unit": r.unit,
            "price_level": r.price_level,
            "source_url": r.source_url,
        }
        for r in records
    ]


async def get_weather(province: str) -> dict:
    """Return cached 72h weather forecast for a province, refreshing from scraper if stale."""
    from backend.scrapers import weather
    from backend import cache

    cache_key = f"weather:{province}"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    data = await weather.get_forecast(province)
    await cache.set(cache_key, data, ttl=3600)  # cache for 1h
    return data


async def get_alerts(session: AsyncSession, province: str, hours: int = 72) -> list[dict]:
    """Fetch recent pest, disease, and weather alerts for a province from the DB."""
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    result = await session.exec(
        select(AlertRecord)
        .where(AlertRecord.province == province)
        .where(AlertRecord.scraped_at >= since)
        .order_by(AlertRecord.published_at.desc())
    )
    records = result.all()
    return [
        {
            "id": r.id,
            "alert_type": r.alert_type,
            "severity": r.severity,
            "pest_name": r.pest_name,
            "regency": r.regency,
            "description": r.description,
            "source_url": r.source_url,
            "published_at": r.published_at.isoformat(),
        }
        for r in records
    ]


async def search_news(query: str) -> list[dict]:
    """
    Search Kementan (pertanian.go.id) for causal context about a price anomaly.
    Used in the agent's research loop (up to 3 hops).
    """
    kementan_query = f"site:pertanian.go.id {query}"
    return await tinyfish_client.search_web(kementan_query)
