import asyncio
import logging

import httpx
from collections import defaultdict
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
from typing import Annotated

from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import case
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from backend import cache, scheduler
from backend.agents import orchestrator
from backend.database import create_db_and_tables, get_session
from backend.models.advisory import Advisory
from backend.models.alert import AlertRecord
from backend.models.price import PriceRecord
from backend.models.note import FarmNote
from backend.scrapers.kemendag_prices import KEMENDAG_COMMODITIES
from backend.scrapers.pertanian_news import scrape_pertanian_news
from backend.scrapers.weather import PROVINCE_COORDS

logger = logging.getLogger(__name__)

# WMO weather code → description mapping
WMO_CODES: dict[int, str] = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Fog",
    51: "Drizzle",
    53: "Drizzle",
    55: "Drizzle",
    61: "Rain",
    63: "Rain",
    65: "Rain",
    80: "Rain showers",
    81: "Rain showers",
    82: "Rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm",
    99: "Thunderstorm",
}

# ── WebSocket connection manager ──────────────────────────────────────────────

_ws_clients: set[WebSocket] = set()


async def _broadcast(message: str) -> None:
    dead = set()
    for ws in _ws_clients:
        try:
            await ws.send_text(message)
        except Exception:
            dead.add(ws)
    _ws_clients.difference_update(dead)


async def _redis_listener() -> None:
    """Subscribe to the 'advisories' Redis channel and fan out to WebSocket clients."""
    client = cache.get_client()
    pubsub = client.pubsub()
    await pubsub.subscribe("advisories")
    async for message in pubsub.listen():
        if message["type"] == "message":
            await _broadcast(message["data"])


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_db_and_tables()
    scheduler.start()
    listener_task = asyncio.create_task(_redis_listener())
    yield
    listener_task.cancel()
    scheduler.stop()
    await cache.close()


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="AgriSentinel", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

Session = Annotated[AsyncSession, Depends(get_session)]


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health(session: Session):
    db_ok = True
    try:
        await session.exec(select(Advisory).limit(1))
    except Exception:
        db_ok = False

    redis_ok = True
    try:
        await cache.get_client().ping()
    except Exception:
        redis_ok = False

    return {
        "status": "ok" if db_ok and redis_ok else "degraded",
        "db": "ok" if db_ok else "error",
        "redis": "ok" if redis_ok else "error",
    }


class RunRequest(BaseModel):
    province: str
    commodity: str | None = None


@app.post("/agent/run", response_model=list[Advisory])
async def agent_run(body: RunRequest, session: Session):
    commodities = [body.commodity] if body.commodity else list(KEMENDAG_COMMODITIES)

    advisories: list[Advisory] = []
    for commodity in commodities:
        try:
            advisories.append(await orchestrator.run(session, body.province, commodity))
        except Exception:
            logger.warning("Agent run failed for %s/%s", body.province, commodity, exc_info=True)

    return advisories


@app.get("/advisories", response_model=list[Advisory])
async def list_advisories(session: Session, limit: int = 20, province: str | None = None):
    q = select(Advisory).order_by(Advisory.created_at.desc()).limit(limit)
    if province:
        q = q.where(Advisory.province == province)
    result = await session.exec(q)
    return result.all()


class AlertItem(BaseModel):
    id: int | None
    alert_type: str
    pest_name: str | None
    severity: str
    province: str
    regency: str | None
    description: str
    source_url: str
    published_at: str


class NewsItem(BaseModel):
    title: str
    url: str
    snippet: str
    published_at: str | None
    source: str
    category: str


@app.get("/alerts", response_model=list[AlertItem])
async def list_alerts(
    session: Session,
    province: str | None = None,
    hours: int = 168,
    limit: int = 50,
):
    """
    Return alert records filtered by province and time window.
    Query params: ?province=&hours=168&limit=50
    Ordered by severity (critical > high > medium > low), then published_at DESC.
    """
    try:
        since = datetime.now(timezone.utc) - timedelta(hours=hours)

        severity_order = case(
            (AlertRecord.severity == "critical", 4),
            (AlertRecord.severity == "high", 3),
            (AlertRecord.severity == "medium", 2),
            else_=1
        ).desc()

        q = (
            select(AlertRecord)
            .where(AlertRecord.scraped_at >= since)
        )
        if province:
            q = q.where(AlertRecord.province == province)
        q = q.order_by(severity_order, AlertRecord.published_at.desc()).limit(limit)

        result = await session.exec(q)
        records = result.all()

        return [
            AlertItem(
                id=r.id,
                alert_type=r.alert_type,
                pest_name=r.pest_name,
                severity=r.severity,
                province=r.province,
                regency=r.regency,
                description=r.description,
                source_url=r.source_url,
                published_at=r.published_at.isoformat(),
            )
            for r in records
        ]
    except Exception:
        logger.warning("Failed to query alerts", exc_info=True)
        return []


# ── News ──────────────────────────────────────────────────────────────────────

_SOURCE_CATEGORY: dict[str, str] = {
    "pertanian.go.id": "Policy",
    "BMKG": "Weather",
    "IPB": "Research",
}


def _map_category(source: str) -> str:
    """Map a news source to its category."""
    for key, category in _SOURCE_CATEGORY.items():
        if key.lower() in source.lower():
            return category
    return "Market"


@app.get("/news", response_model=list[NewsItem])
async def list_news(query: str = ""):
    """
    Return agricultural news from pertanian.go.id and Google News RSS.
    Query params: ?query= (optional search filter).
    Category is derived from source: 'pertanian.go.id' → Policy, everything else → Market.
    """
    try:
        articles = await scrape_pertanian_news(query=query)
    except Exception:
        logger.warning("News scrape failed", exc_info=True)
        return []

    return [
        NewsItem(
            title=a["title"],
            url=a["url"],
            snippet=a.get("snippet", ""),
            published_at=a.get("published_at"),
            source=a.get("source", ""),
            category=_map_category(a.get("source", "")),
        )
        for a in articles
    ]


class TrendPoint(BaseModel):
    date: str
    price: float


class PriceResponse(BaseModel):
    commodity: str
    city: str
    price: float
    delta_pct: float | None
    unit: str
    trend: list[TrendPoint]
    source_url: str


@app.get("/prices", response_model=list[PriceResponse])
async def list_prices(
    session: Session,
    province: str | None = None,
    commodity: str | None = None,
    days: int = 7,
):
    """
    Return price records grouped by commodity with 7-day stats and sparkline trend.
    Query params: ?province=&commodity=&days=7
    """
    try:
        since = date.today() - timedelta(days=days)

        q = (
            select(PriceRecord)
            .where(PriceRecord.date_of_price >= since)
        )
        if province:
            q = q.where(PriceRecord.province == province)
        if commodity:
            q = q.where(PriceRecord.commodity == commodity)
        q = q.order_by(PriceRecord.commodity, PriceRecord.date_of_price.desc())

        result = await session.exec(q)
        records = result.all()

        groups: dict[str, list[PriceRecord]] = defaultdict(list)
        for r in records:
            groups[r.commodity].append(r)

        response: list[PriceResponse] = []
        for commodity_name, group_records in groups.items():
            group_records.sort(key=lambda r: r.date_of_price, reverse=True)
            latest = group_records[0]

            prices_decimal = [r.price for r in group_records]
            avg_price = sum(prices_decimal) / len(prices_decimal)

            delta_pct = None
            if avg_price != 0:
                delta_pct = round(float((latest.price - avg_price) / avg_price * 100), 1)

            group_records.sort(key=lambda r: r.date_of_price)
            trend = [
                TrendPoint(date=r.date_of_price.isoformat(), price=float(r.price))
                for r in group_records
            ]

            response.append(PriceResponse(
                commodity=latest.commodity,
                city=latest.city,
                price=float(latest.price),
                delta_pct=delta_pct,
                unit=latest.unit,
                trend=trend,
                source_url=latest.source_url,
            ))

        return response
    except Exception:
        logger.warning("Failed to query prices", exc_info=True)
        return []


class NoteCreate(BaseModel):
    plot: str
    crop: str
    tag: str
    title: str
    body: str


class NoteResponse(BaseModel):
    id: int
    plot: str
    crop: str
    tag: str
    title: str
    body: str
    created_at: datetime


class FeedbackBody(BaseModel):
    helpful: bool


class CurrentWeather(BaseModel):
    temp: float
    humidity: int
    wind_kmh: float
    weathercode: int
    description: str


class DailyForecast(BaseModel):
    date: str
    hi: float
    lo: float
    rain_mm: float
    weathercode: int
    wind_max: float


class WeatherForecastResponse(BaseModel):
    province: str
    current: CurrentWeather | None = None
    daily: list[DailyForecast] = []
    source_url: str


@app.patch("/advisories/{advisory_id}/feedback")
async def update_feedback(advisory_id: int, body: FeedbackBody, session: Session):
    advisory = await session.get(Advisory, advisory_id)
    if not advisory:
        raise HTTPException(status_code=404, detail="Advisory not found")
    advisory.feedback_helpful = 1 if body.helpful else 0
    session.add(advisory)
    await session.commit()
    return {"status": "ok"}


# ── Notes ──────────────────────────────────────────────────────────────────────


@app.get("/notes", response_model=list[NoteResponse])
async def list_notes(session: Session):
    """Return all farm notes, newest first, max 100."""
    try:
        q = select(FarmNote).order_by(FarmNote.created_at.desc()).limit(100)
        result = await session.exec(q)
        return result.all()
    except Exception:
        logger.warning("Failed to query notes", exc_info=True)
        return []


@app.post("/notes", response_model=NoteResponse)
async def create_note(body: NoteCreate, session: Session):
    """Create a new farm note."""
    try:
        note = FarmNote(
            plot=body.plot,
            crop=body.crop,
            tag=body.tag,
            title=body.title,
            body=body.body,
        )
        session.add(note)
        await session.commit()
        await session.refresh(note)
        return note
    except Exception:
        logger.warning("Failed to create note", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create note")


@app.delete("/notes/{note_id}")
async def delete_note(note_id: int, session: Session):
    """Delete a farm note by ID."""
    note = await session.get(FarmNote, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    await session.delete(note)
    await session.commit()
    return {"status": "ok"}


@app.get("/weather/forecast", response_model=WeatherForecastResponse)
async def weather_forecast(province: str = "Jawa Barat", days: int = 7):
    """Return daily weather forecast + current conditions from Open-Meteo."""
    coords = PROVINCE_COORDS.get(province, PROVINCE_COORDS["Jawa Barat"])
    lat, lon = coords
    days = min(max(days, 1), 7)

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,windspeed_10m_max",
                    "current": "temperature_2m,relativehumidity_2m,windspeed_10m,weathercode",
                    "forecast_days": days,
                    "timezone": "Asia/Jakarta",
                },
            )
            response.raise_for_status()
            data = response.json()

        current_data = data.get("current", {}) or {}
        current = CurrentWeather(
            temp=float(current_data.get("temperature_2m", 0)),
            humidity=int(current_data.get("relativehumidity_2m", 0)),
            wind_kmh=float(current_data.get("windspeed_10m", 0)),
            weathercode=int(current_data.get("weathercode", 0)),
            description=WMO_CODES.get(int(current_data.get("weathercode", 0)), "Unknown"),
        )

        daily_data = data.get("daily", {}) or {}
        dates = daily_data.get("time", [])
        hi_list = daily_data.get("temperature_2m_max", [])
        lo_list = daily_data.get("temperature_2m_min", [])
        rain_list = daily_data.get("precipitation_sum", [])
        wcode_list = daily_data.get("weathercode", [])
        wind_list = daily_data.get("windspeed_10m_max", [])

        daily: list[DailyForecast] = []
        for i in range(len(dates)):
            wcode = int(wcode_list[i]) if i < len(wcode_list) else 0
            daily.append(DailyForecast(
                date=str(dates[i]) if i < len(dates) else "",
                hi=float(hi_list[i]) if i < len(hi_list) else 0.0,
                lo=float(lo_list[i]) if i < len(lo_list) else 0.0,
                rain_mm=float(rain_list[i]) if i < len(rain_list) else 0.0,
                weathercode=wcode,
                wind_max=float(wind_list[i]) if i < len(wind_list) else 0.0,
            ))

        return WeatherForecastResponse(
            province=province,
            current=current,
            daily=daily,
            source_url="https://api.open-meteo.com/",
        )

    except Exception as exc:
        logger.warning("Weather forecast failed for %s: %s — returning defaults", province, exc)
        return WeatherForecastResponse(
            province=province,
            current=None,
            daily=[],
            source_url="https://api.open-meteo.com/",
        )


@app.websocket("/ws/advisories")
async def ws_advisories(websocket: WebSocket):
    await websocket.accept()
    _ws_clients.add(websocket)
    try:
        while True:
            await websocket.receive_text()   # keep connection alive
    except WebSocketDisconnect:
        _ws_clients.discard(websocket)
