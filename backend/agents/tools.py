import logging
from datetime import date, datetime, timedelta, timezone

from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.price import PriceRecord
from backend.models.alert import AlertRecord
from backend.scrapers import tinyfish_client

logger = logging.getLogger(__name__)


async def get_prices(session: AsyncSession, province: str, commodity: str, days: int = 7) -> list[dict]:
    """
    Scrape fresh KEMENDAG prices for province/commodity, persist any new records,
    then return the last `days` days of records from the DB.
    """
    from backend.scrapers.kemendag_prices import scrape_kemendag_prices

    # Only scrape if we have no record for today yet — avoids duplicate inserts on
    # repeated agent runs within the same day.
    today = date.today()
    existing = await session.exec(
        select(PriceRecord)
        .where(PriceRecord.province == province)
        .where(PriceRecord.commodity == commodity)
        .where(PriceRecord.date_of_price == today)
        .limit(1)
    )
    if not existing.first():
        try:
            fresh = await scrape_kemendag_prices(province)
            for record in fresh:
                if record.commodity == commodity:
                    session.add(record)
            await session.flush()
        except Exception:
            logger.warning("KEMENDAG scrape failed for %s/%s — using existing DB data", province, commodity)

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
    await cache.set(cache_key, data, ttl=3600)  # 1h TTL
    return data


async def get_alerts(session: AsyncSession, province: str, hours: int = 72) -> list[dict]:
    """
    Scrape fresh BBPOPT pest alerts, persist any new records for the given province,
    then return all alerts scraped within the last `hours` hours from the DB.
    """
    from backend.scrapers.bbpopt_alerts import scrape_bbpopt_alerts

    # Only scrape if we have no BBPOPT alert for this province in the last hour —
    # avoids hammering the legacy portal on every agent run.
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    recent = await session.exec(
        select(AlertRecord)
        .where(AlertRecord.province == province)
        .where(AlertRecord.source_url.contains("bbpopt"))
        .where(AlertRecord.scraped_at >= one_hour_ago)
        .limit(1)
    )
    if not recent.first():
        try:
            fresh_alerts = await scrape_bbpopt_alerts()
            for alert in fresh_alerts:
                if province.lower() in alert.province.lower():
                    session.add(alert)
            await session.flush()
        except Exception:
            logger.warning("BBPOPT scrape failed for %s — using existing DB data", province)

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
    from backend.scrapers.pertanian_news import scrape_pertanian_news
    return await scrape_pertanian_news(query=query)
