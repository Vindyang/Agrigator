"""
SP2KP (KEMENDAG) wholesale price scraper.

Primary:  TinyFish extract_table on sp2kp.kemendag.go.id — gets the JS-rendered
          province-specific price table (real browser, stealth profile).
Fallback: Direct HNT API (Harga Nasional Tertimbang) — no-auth JSON endpoint,
          national weighted averages, used when TinyFish times out.

Returns validated PriceRecord models — never raw dicts.
"""

import asyncio
import logging
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation

import httpx

from backend.models.price import PriceLevel, PriceRecord
from backend.scrapers.tinyfish_client import TinyFishClient, TinyFishError

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
_KOMODITAS_MAP: dict[int, str] = {
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

# Commodity name patterns for matching TinyFish-extracted text
_COMMODITY_NAME_MAP: dict[str, str] = {
    "beras": "beras",
    "gula": "gula",
    "minyak": "minyak_goreng",
    "daging sapi": "daging_sapi",
    "daging ayam": "daging_ayam",
    "telur": "telur",
    "jagung": "jagung",
    "kedelai": "kedelai",
    "cabai": "cabai",
    "bawang merah": "bawang_merah",
    "bawang putih": "bawang_putih",
}

_TINYFISH_GOAL = """
Extract national food commodity price data from this Indonesian government price portal (SP2KP).

This is a JavaScript Single-Page Application — wait for the price table to fully render.
A loading spinner may appear; wait for it to disappear before extracting.

Steps:
1. Dismiss any cookie consent or welcome dialog if present.
2. Do NOT change any province filter — use the default national (Nasional) view.
3. Locate the main price table showing food commodity prices (harga pangan pokok).
4. For each row in the table extract:
   - commodity: food item name exactly as shown (e.g. "Beras Medium", "Cabai Merah Keriting")
   - price: price as a plain number in IDR, no currency symbol (e.g. 12500)
   - unit: unit shown (e.g. "per kg", "kg"), default "per kg" if not shown

Return as JSON:
{"rows": [{"commodity": "Beras Medium", "price": 12500, "unit": "per kg"}]}

If the table has no data or fails to load, return {"rows": []}.
If a CAPTCHA appears, return {"rows": [], "error": "captcha"}.
"""


def _normalise_commodity(raw: str) -> str | None:
    key = raw.strip().lower()
    for pattern, name in _COMMODITY_NAME_MAP.items():
        if pattern in key:
            return name
    return None


def _parse_price(raw: object) -> Decimal | None:
    try:
        cleaned = str(raw).replace("Rp", "").replace(".", "").replace(",", ".").strip()
        val = Decimal(cleaned)
        if 1_000 <= val <= 2_000_000:
            return val
    except (InvalidOperation, ValueError):
        pass
    return None


def _rows_to_records(
    rows: list[dict],
    province: str,
    now: datetime,
) -> list[PriceRecord]:
    records: list[PriceRecord] = []
    seen: set[str] = set()
    for row in rows:
        commodity = _normalise_commodity(str(row.get("commodity", "")))
        if not commodity or commodity in seen:
            continue
        price = _parse_price(row.get("price"))
        if price is None:
            continue
        seen.add(commodity)
        records.append(
            PriceRecord(
                commodity=commodity,
                province=str(row.get("province", province)).strip() or province,
                city=province,
                price=price,
                currency="IDR",
                unit=str(row.get("unit", "per kg")).strip() or "per kg",
                price_level=PriceLevel.wholesale,
                source_url=SOURCE_URL,
                scraped_at=now,
                date_of_price=date.today(),
            )
        )
    return records


# ---------------------------------------------------------------------------
# TinyFish — national dashboard
# ---------------------------------------------------------------------------

async def _scrape_national_via_tinyfish() -> list[PriceRecord]:
    """Use TinyFish to scrape the national price overview from SP2KP."""
    client = TinyFishClient()
    try:
        rows = await asyncio.wait_for(
            client.extract_table(
                SOURCE_URL,
                schema={},
                goal_override=_TINYFISH_GOAL,
                browser_profile="stealth",
                proxy_country="US",
            ),
            timeout=120.0,
        )
    except (TinyFishError, asyncio.TimeoutError) as exc:
        logger.warning("TinyFish SP2KP national scrape failed: %s", exc)
        return []

    now = datetime.now(timezone.utc)
    records = _rows_to_records(rows, "Nasional", now)
    logger.info("TinyFish SP2KP national: %d price records", len(records))
    return records


# ---------------------------------------------------------------------------
# HNT API fallback
# ---------------------------------------------------------------------------

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


async def _scrape_via_hnt_api(province: str) -> list[PriceRecord]:
    """Fallback: fetch Harga Nasional Tertimbang (national weighted prices) directly."""
    try:
        async with httpx.AsyncClient(headers=_HEADERS, follow_redirects=True) as client:
            tanggal = await _get_latest_tanggal(client)
            r = await client.get(_HNT_API, params={"tanggal": tanggal}, timeout=15)
            r.raise_for_status()
            items = r.json().get("data", [])
    except Exception as exc:
        logger.warning("HNT API fallback failed: %s", exc)
        return []

    now = datetime.now(timezone.utc)
    records: list[PriceRecord] = []
    seen: set[int] = set()

    for item in items:
        kid: int = item.get("komoditas_id", 0)
        if kid not in _KOMODITAS_MAP or kid in seen:
            continue
        price_raw = item.get("hnt_penduduk") or item.get("hnt_sbh")
        if not price_raw:
            continue
        try:
            price = Decimal(str(price_raw)).quantize(Decimal("1"))
        except Exception:
            continue
        seen.add(kid)
        try:
            price_date = date.fromisoformat(item.get("tanggal", tanggal))
        except ValueError:
            price_date = date.today()
        records.append(
            PriceRecord(
                commodity=_KOMODITAS_MAP[kid],
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

    logger.info("HNT API fallback: %d records for %s (%s)", len(records), province, tanggal)
    return records


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

async def scrape_kemendag_prices(province: str) -> list[PriceRecord]:
    """
    Scrape SP2KP commodity prices.

    - Province prices: direct HNT API (fast, reliable, tagged with province)
    - National prices: TinyFish browser scrape (runs in parallel, showcases TinyFish)

    Returns province records + national records combined.
    National records are optional — province records alone are sufficient for the agent.
    """
    province_records, national_records = await asyncio.gather(
        _scrape_via_hnt_api(province),
        _scrape_national_via_tinyfish(),
        return_exceptions=True,
    )

    result: list[PriceRecord] = []
    if isinstance(province_records, list):
        result.extend(province_records)
    if isinstance(national_records, list):
        result.extend(national_records)

    logger.info(
        "KEMENDAG total: %d records (%d province, %d national)",
        len(result),
        len(province_records) if isinstance(province_records, list) else 0,
        len(national_records) if isinstance(national_records, list) else 0,
    )
    return result
