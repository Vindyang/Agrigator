from openai import AsyncOpenAI

from backend.config import GROQ_API_KEY
from backend.models.advisory import SignalCategory

_client = AsyncOpenAI(
    api_key=GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1",
)

_TRANSLATE_PROMPT = (
    "Translate the following agricultural advisory into Bahasa Indonesia. "
    "Use simple, clear language appropriate for Indonesian farmers with basic literacy. "
    "Preserve all numbers, commodity names (beras=rice, jagung=corn, kedelai=soybean, cabai=chili), "
    "percentages, and action verbs accurately. Keep the translation concise and under 250 words."
)


async def generate_advisory(
    signal_category: SignalCategory,
    commodity: str,
    province: str,
    price_change_pct: float | None,
    weather_data: dict,
    alerts: list[dict],
    news_context: list[dict],
    confidence: float,
) -> str:
    """Generate a plain-language English advisory from the compound signal data."""
    context = (
        f"Signal: {signal_category.value}\n"
        f"Commodity: {commodity} | Province: {province}\n"
        f"Price change: {price_change_pct:+.1f}% vs 7-day average\n"
        f"Weather (72h): precipitation={weather_data.get('precipitation_mm', 0)}mm, "
        f"wind={weather_data.get('wind_kmh', 0)}km/h\n"
        f"Active alerts: {len(alerts)}\n"
    )
    if alerts:
        for a in alerts[:3]:
            context += f"  - [{a['alert_type']}] {a.get('pest_name') or a['description'][:80]} ({a['severity']})\n"
    if news_context:
        context += "Causal context from Kementan:\n"
        for n in news_context[:2]:
            context += f"  - {n.get('title', '')}: {n.get('snippet', '')[:120]}\n"

    prompt = (
        "You are an Indonesian agricultural intelligence analyst. "
        "Based on the following signal data, write a concise, actionable advisory (under 200 words) "
        "for smallholder farmers. Be specific about what action to take and why.\n\n"
        + context
    )

    resp = await _client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=300,
    )
    return resp.choices[0].message.content.strip()


async def translate_advisory(text_en: str) -> str:
    """Translate the English advisory into Bahasa Indonesia."""
    resp = await _client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": _TRANSLATE_PROMPT},
            {"role": "user", "content": text_en},
        ],
        temperature=0.2,
        max_tokens=350,
    )
    return resp.choices[0].message.content.strip()
