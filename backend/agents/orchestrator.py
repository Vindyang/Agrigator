import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from backend.agents import advisory_generator, signal_detector, tools
from backend.scrapers.tinyfish_client import TinyFishError
from backend.models.advisory import Advisory, AdvisoryAlertLink, AdvisoryPriceLink, SignalCategory
from backend.models.alert import AlertRecord
from backend.models.price import PriceRecord
from backend import cache

logger = logging.getLogger(__name__)


async def run(session: AsyncSession, province: str, commodity: str) -> Advisory:
    """
    Full agent loop for one province + commodity:
    1. Fetch prices, weather, alerts
    2. Detect price anomaly
    3. If anomaly found, research causal context via Kementan (up to 3 hops)
    4. Evaluate compound signal
    5. Generate + translate advisory
    6. Persist to DB and broadcast via Redis
    """
    trace: list[dict] = []

    # --- Step 1: Data collection ---
    prices = await tools.get_prices(session, province, commodity)
    trace.append({"tool": "get_prices", "result_count": len(prices)})

    weather = await tools.get_weather(province)
    trace.append({"tool": "get_weather", "result": weather})

    alerts = await tools.get_alerts(session, province)
    trace.append({"tool": "get_alerts", "result_count": len(alerts)})

    # --- Step 2: Price anomaly detection ---
    history = [p["price"] for p in prices[1:]]   # all but the latest
    current_price = prices[0]["price"] if prices else 0.0
    is_anomaly, pct_change = signal_detector.price_anomaly(current_price, history)
    trace.append({"tool": "price_anomaly", "is_anomaly": is_anomaly, "pct_change": pct_change})

    # --- Step 3: Causal research loop (up to 3 hops if anomaly detected) ---
    news_context: list[dict] = []
    if is_anomaly:
        hop_queries = [
            f"{commodity} {province} harga naik penyebab",
            f"{commodity} Indonesia kenaikan harga",
            f"{commodity} gangguan pasokan distribusi",
        ]
        for hop, query in enumerate(hop_queries):
            try:
                results = await tools.search_news(query)
            except TinyFishError:
                logger.warning("TinyFish unavailable on hop %d — skipping news search", hop + 1)
                break
            trace.append({"tool": "search_news", "hop": hop + 1, "query": query, "result_count": len(results)})
            news_context.extend(results[:3])
            if len(news_context) >= 3:
                break   # enough context collected

    # --- Step 4: Compound signal evaluation ---
    price_anomalies = [(is_anomaly, pct_change)]
    signal, confidence = signal_detector.compound_signal(price_anomalies, weather, alerts)
    trace.append({"tool": "compound_signal", "signal": signal.value, "confidence": confidence})

    # --- Step 5: Advisory generation ---
    text_en = await advisory_generator.generate_advisory(
        signal_category=signal,
        commodity=commodity,
        province=province,
        price_change_pct=pct_change if is_anomaly else None,
        weather_data=weather,
        alerts=alerts,
        news_context=news_context,
        confidence=confidence,
    )
    text_id = await advisory_generator.translate_advisory(text_en)
    trace.append({"tool": "generate_advisory", "text_en_len": len(text_en)})

    # --- Step 6: Persist advisory ---
    advisory = Advisory(
        signal_category=signal,
        commodity=commodity,
        province=province,
        advisory_text_en=text_en,
        advisory_text_id=text_id,
        confidence=confidence,
        price_change_pct=pct_change if is_anomaly else None,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=6),
        agent_trace={"steps": trace},
    )
    session.add(advisory)
    await session.flush()   # get advisory.id without committing

    # Link to price records and alert records used as evidence
    for price in prices:
        pr = await session.get(PriceRecord, price.get("id"))
        if pr:
            session.add(AdvisoryPriceLink(advisory_id=advisory.id, price_record_id=pr.id))

    for alert in alerts:
        ar = await session.get(AlertRecord, alert.get("id"))
        if ar:
            session.add(AdvisoryAlertLink(advisory_id=advisory.id, alert_record_id=ar.id))

    await session.commit()
    await session.refresh(advisory)

    # --- Step 7: Broadcast via Redis pub/sub ---
    await cache.publish("advisories", advisory.model_dump(mode="json"))
    logger.info("Advisory %d published: %s %s %s (%.0f%%)", advisory.id, signal.value, commodity, province, confidence * 100)

    return advisory
