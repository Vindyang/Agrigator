"""
Weather forecast scraper — Open-Meteo primary, neutral fallback on failure.

Return shape (do not change keys — contract with signal_detector.compound_signal):
{
    "province": str,
    "precipitation_mm": float,   # max hourly value over 72h window
    "wind_kmh": float,           # max hourly value over 72h window
    "has_rain_alert": bool,      # precipitation_mm > 70
    "humidity_normal": bool,     # avg relative humidity < 80%
    "source_url": str,
}

Signal thresholds (see signal_detector.compound_signal):
    severe_weather = precipitation_mm > 70 OR wind_kmh > 50
"""

import logging

import httpx

logger = logging.getLogger(__name__)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

# Province name → (latitude, longitude)
PROVINCE_COORDS: dict[str, tuple[float, float]] = {
    "Jawa Barat": (-6.9175, 107.6191),
    "Jawa Tengah": (-7.1510, 110.1403),
    "Jawa Timur": (-7.5361, 112.2384),
    "Sulawesi Selatan": (-5.1477, 119.4327),
    "Sumatera Utara": (3.5952, 98.6722),
}

_NEUTRAL: dict = {
    "precipitation_mm": 0.0,
    "wind_kmh": 0.0,
    "has_rain_alert": False,
    "humidity_normal": True,
    "source_url": "https://www.bmkg.go.id/",
}


async def get_forecast(province: str) -> dict:
    """Return 72h weather forecast for a province via Open-Meteo."""
    coords = PROVINCE_COORDS.get(province, PROVINCE_COORDS["Jawa Barat"])
    lat, lon = coords

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                OPEN_METEO_URL,
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "hourly": "precipitation,windspeed_10m,relativehumidity_2m",
                    "forecast_days": 3,
                    "timezone": "Asia/Jakarta",
                },
            )
            response.raise_for_status()
            data = response.json()

        hourly = data.get("hourly", {})
        precip: list[float] = hourly.get("precipitation", [])
        wind: list[float] = hourly.get("windspeed_10m", [])
        humidity: list[float] = hourly.get("relativehumidity_2m", [])

        max_precip = max(precip) if precip else 0.0
        max_wind = max(wind) if wind else 0.0
        avg_humidity = sum(humidity) / len(humidity) if humidity else 70.0

        return {
            "province": province,
            "precipitation_mm": round(max_precip, 2),
            "wind_kmh": round(max_wind, 2),
            "has_rain_alert": max_precip > 70,
            "humidity_normal": avg_humidity < 80,
            "source_url": "https://api.open-meteo.com/",
        }

    except Exception as exc:
        logger.warning(
            "Open-Meteo forecast failed for %s: %s — returning neutral defaults",
            province,
            exc,
        )
        return {"province": province, **_NEUTRAL}
