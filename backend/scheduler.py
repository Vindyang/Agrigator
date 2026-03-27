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


async def _run_all_targets() -> None:
    async with async_session() as session:
        for province, commodity in _TARGETS:
            try:
                await orchestrator.run(session, province, commodity)
            except Exception:
                logger.exception("Agent run failed for %s / %s", province, commodity)


def start() -> None:
    scheduler.add_job(_run_all_targets, "interval", hours=6, id="price_agent_run")
    scheduler.add_job(_run_all_targets, "interval", hours=1, id="weather_refresh")
    scheduler.start()
    logger.info("Scheduler started")


def stop() -> None:
    scheduler.shutdown(wait=False)
