"""
SP2KP (KEMENDAG) wholesale price scraper.

Uses the HNT (Harga Nasional Tertimbang) API directly — a no-auth JSON endpoint
that returns national weighted average prices per commodity per date.

Returns validated PriceRecord models — never raw dicts.
"""

import logging
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation

import httpx

from backend.models.price import PriceLevel, PriceRecord

logger = logging.getLogger(__name__)

SOURCE_URL = "https://sp2kp.kemendag.go.id"
_HNT_API = "https://api-sp2kp.kemendag.go.id/report/api/hnt"
_LATEST_DATE_API = "https://api-sp2kp.kemendag.go.id/report/api/latest-price-dates"

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Referer": "https://sp2kp.kemendag.go.id/",
}

# komoditas_id → internal name (from /master/api/komoditas)
KOMODITAS_MAP: dict[int, str] = {
    1: "beras",
    2: "gula",
    3: "minyak_goreng",
    4: "daging_sapi",
    5: "daging_ayam",
    6: "telur",
    8: "jagung",
    10: "kedelai",
    11: "cabai",
    12: "bawang_merah",
}

KEMENDAG_COMMODITIES: tuple[str, ...] = tuple(KOMODITAS_MAP.values())


async def _get_latest_tanggal(client: httpx.AsyncClient) -> str:
    try:
        r = await client.get(
            _LATEST_DATE_API,
            params={"tipe_komoditas_id": 1},
            timeout=10,
        )
        r.raise_for_status()
        return r.json()["data"]["tanggal"]
    except Exception:
        return (date.today() - timedelta(days=1)).isoformat()


async def scrape_kemendag_prices(province: str) -> list[PriceRecord]:
    """
    Fetch HNT (Harga Nasional Tertimbang) commodity prices from the KEMENDAG API.

    Returns national weighted average prices tagged with the requested province.
    Returns [] on failure so the agent loop can proceed with partial data.
    """
    try:
        async with httpx.AsyncClient(headers=_HEADERS, follow_redirects=True) as client:
            tanggal = await _get_latest_tanggal(client)
            r = await client.get(_HNT_API, params={"tanggal": tanggal}, timeout=15)
            r.raise_for_status()
            items = r.json().get("data", [])
    except Exception as exc:
        logger.warning("KEMENDAG HNT API failed: %s", exc)
        return []

    now = datetime.now(timezone.utc)
    records: list[PriceRecord] = []
    seen: set[int] = set()

    for item in items:
        kid: int = item.get("komoditas_id", 0)
        if kid not in KOMODITAS_MAP or kid in seen:
            continue
        price_raw = item.get("hnt_penduduk") or item.get("hnt_sbh")
        if not price_raw:
            continue
        try:
            price = Decimal(str(price_raw)).quantize(Decimal("1"))
        except (InvalidOperation, ValueError):
            continue
        if not (1_000 <= price <= 2_000_000):
            continue
        seen.add(kid)
        try:
            price_date = date.fromisoformat(item.get("tanggal", tanggal))
        except ValueError:
            price_date = date.today()
        records.append(
            PriceRecord(
                commodity=KOMODITAS_MAP[kid],
                province=province,
                city=province,
                price=price,
                currency="IDR",
                unit="per kg",
                price_level=PriceLevel.wholesale,
                source_url=SOURCE_URL,
                scraped_at=now,
                date_of_price=price_date,
            )
        )

    logger.info("KEMENDAG HNT: %d records for %s (%s)", len(records), province, tanggal)
    return records
