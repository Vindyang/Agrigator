import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from backend.agents import orchestrator
from backend.database import async_session

logger = logging.getLogger(__name__)

# Province + commodity pairs to monitor
_TARGETS = [
    ("Jawa Barat", "beras"),
    ("Jawa Tengah", "jagung"),
    ("Jawa Timur", "kedelai"),
    ("Sulawesi Selatan", "beras"),
    ("Sumatera Utara", "cabai"),
]

scheduler = AsyncIOScheduler()


async def _run_agent() -> None:
    """Full orchestrator loop — runs every 6h when new price data is available."""
    async with async_session() as session:
        for province, commodity in _TARGETS:
            try:
                await orchestrator.run(session, province, commodity)
            except Exception:
                logger.exception("Agent run failed for %s / %s", province, commodity)


async def _refresh_weather() -> None:
    """Refresh weather cache only — no GPT-4o call, runs every 1h."""
    from backend.scrapers import weather
    from backend import cache

    provinces = {province for province, _ in _TARGETS}
    for province in provinces:
        try:
            data = await weather.get_forecast(province)
            await cache.set(f"weather:{province}", data, ttl=3600)
        except Exception:
            logger.exception("Weather refresh failed for %s", province)


def start() -> None:
    scheduler.add_job(_run_agent, "interval", hours=6, id="price_agent_run")
    scheduler.add_job(_refresh_weather, "interval", hours=1, id="weather_refresh")
    scheduler.start()
    logger.info("Scheduler started")


def stop() -> None:
    scheduler.shutdown(wait=False)
