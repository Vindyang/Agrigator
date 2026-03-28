from backend.models.advisory import SignalCategory


def price_anomaly(current: float, history: list[float]) -> tuple[bool, float]:
    if not history:
        return False, 0.0

    avg = sum(history) / len(history)
    if avg == 0:
        return False, 0.0

    pct_change = ((current - avg) / avg) * 100
    return abs(pct_change) > 8.0, round(pct_change, 2)


def compound_signal(
    price_anomalies: list[tuple[bool, float]],
    weather_data: dict,
    alerts: list[dict],
) -> tuple[SignalCategory, float]:
    """
    weather_data keys: precipitation_mm, wind_kmh, has_rain_alert, humidity_normal
    alerts items: {alert_type: pest|disease|weather, severity: low|medium|high|critical}
    Returns (SignalCategory, confidence 0.0–1.0)
    """
    has_price_anomaly = any(is_anom for is_anom, _ in price_anomalies)
    max_pct = max((abs(pct) for _, pct in price_anomalies), default=0.0)

    precip = weather_data.get("precipitation_mm", 0)
    wind = weather_data.get("wind_kmh", 0)
    severe_weather = precip > 70 or wind > 50

    pest_or_disease = any(
        a.get("alert_type") in ("pest", "disease") and a.get("severity") in ("high", "critical")
        for a in alerts
    )

    # Price spike + severe weather
    if has_price_anomaly and severe_weather:
        return SignalCategory.urgent_action, round(min(0.95, 0.7 + max_pct / 100), 2)

    # Price spike + pest/disease alert
    if has_price_anomaly and pest_or_disease:
        return SignalCategory.urgent_action, round(min(0.95, 0.75 + max_pct / 100), 2)

    # Price at seasonal low + favourable weather
    price_at_low = any(pct < -8 for _, pct in price_anomalies)
    favourable = not weather_data.get("has_rain_alert", False) and weather_data.get("humidity_normal", True)
    if price_at_low and favourable:
        return SignalCategory.opportunity, 0.70

    # Single signal, no corroboration
    if has_price_anomaly or alerts:
        return SignalCategory.monitor, 0.55

    return SignalCategory.hold, 0.90
