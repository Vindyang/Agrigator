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
    """Fetch 72h weather forecast for a province (Person B implements scrapers/weather.py)."""
    from backend.scrapers import weather
    return await weather.get_forecast(province)


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
