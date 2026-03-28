import json
from typing import Any

import redis.asyncio as aioredis

from backend.config import REDIS_URL

_client: aioredis.Redis | None = None


def get_client() -> aioredis.Redis:
    global _client
    if _client is None:
        _client = aioredis.from_url(REDIS_URL, decode_responses=True)
    return _client


async def get(key: str) -> Any | None:
    value = await get_client().get(key)
    return json.loads(value) if value else None


async def set(key: str, value: Any, ttl: int | None = None) -> None:
    raw = json.dumps(value, default=str)
    if ttl:
        await get_client().setex(key, ttl, raw)
    else:
        await get_client().set(key, raw)


async def delete(key: str) -> None:
    await get_client().delete(key)


async def publish(channel: str, message: Any) -> None:
    await get_client().publish(channel, json.dumps(message, default=str))


async def close() -> None:
    global _client
    if _client:
        await _client.aclose()
        _client = None
