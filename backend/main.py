import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from backend import cache, scheduler
from backend.agents import orchestrator
from backend.database import create_db_and_tables, get_session
from backend.models.advisory import Advisory
from backend.scrapers.kemendag_prices import KEMENDAG_COMMODITIES

logger = logging.getLogger(__name__)

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


class FeedbackBody(BaseModel):
    helpful: bool


@app.patch("/advisories/{advisory_id}/feedback")
async def update_feedback(advisory_id: int, body: FeedbackBody, session: Session):
    advisory = await session.get(Advisory, advisory_id)
    if not advisory:
        raise HTTPException(status_code=404, detail="Advisory not found")
    advisory.feedback_helpful = 1 if body.helpful else 0
    session.add(advisory)
    await session.commit()
    return {"status": "ok"}


@app.websocket("/ws/advisories")
async def ws_advisories(websocket: WebSocket):
    await websocket.accept()
    _ws_clients.add(websocket)
    try:
        while True:
            await websocket.receive_text()   # keep connection alive
    except WebSocketDisconnect:
        _ws_clients.discard(websocket)
