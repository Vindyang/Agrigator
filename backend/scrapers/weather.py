"""
Weather forecast stub — returns a neutral 72h forecast for a given province.

Person B replaces the stub body with real BMKG scraping via TinyFish.
The return shape is the contract: do not change keys.

Expected return shape:
{
    "province": str,
    "precipitation_mm": float,   # max expected over 72h window
    "wind_kmh": float,           # max expected over 72h window
    "has_rain_alert": bool,      # BMKG issued a heavy-rain warning
    "humidity_normal": bool,     # humidity within normal seasonal range
    "source_url": str,
}

Signal thresholds (see signal_detector.compound_signal):
    severe_weather = precipitation_mm > 70 OR wind_kmh > 50
"""

import logging

logger = logging.getLogger(__name__)


async def get_forecast(province: str) -> dict:
    """
    Return 72h weather forecast for a province.

    Stub: returns neutral defaults so the agent loop runs without false alerts.
    Person B implements real BMKG scraping here.
    """
    logger.debug("weather.get_forecast called for %s (stub — returning neutral defaults)", province)
    return {
        "province": province,
        "precipitation_mm": 0.0,
        "wind_kmh": 0.0,
        "has_rain_alert": False,
        "humidity_normal": True,
        "source_url": "https://www.bmkg.go.id/",
    }
