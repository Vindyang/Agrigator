"""
KEMENDAG wholesale market price scraper.

Source: Kementerian Perdagangan (Ministry of Trade) commodity price monitoring portal.
URL: https://www.kemendag.go.id/id/harga-pangan

Uses TinyFish extract_table to handle the JS-rendered price table.
Returns validated PriceRecord models — never raw dicts.
"""

import logging
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation

from backend.models.price import PriceLevel, PriceRecord
from backend.scrapers.tinyfish_client import TinyFishClient, TinyFishError

logger = logging.getLogger(__name__)

SOURCE_URL = "https://www.kemendag.go.id/id/harga-pangan"

# Explicit, step-by-step goal following TinyFish prompting best practices.
# Key elements: wait instruction, visual element descriptions, exact JSON schema with examples.
_EXTRACTION_GOAL = """
Extract commodity price data from this Indonesian government price monitoring page.

IMPORTANT: This page is rendered by JavaScript. Wait for the price data table to fully load
before extracting — it may take several seconds to appear. If a loading spinner or skeleton
rows are visible, wait for them to disappear before proceeding.

Steps:
1. If a cookie consent, language selection, or privacy notice dialog appears, dismiss it first.
2. Look for the main price table in the center of the page showing food commodity prices.
3. For each visible row in the table, extract the following fields:
   - commodity: the food item name exactly as shown (e.g. "Beras Medium", "Cabai Merah Keriting")
   - price: the price as a plain number in IDR with no currency symbol (e.g. 12500)
   - unit: the unit of measurement (e.g. "per kg", "per liter")
   - city: the city or market name shown in the row
   - province: the province name shown in the row
   - date: the date of the price record as shown

Do NOT click any pagination — extract only the currently visible rows.
Stop when all visible rows are extracted.

If the table has no data or fails to load, return {"rows": []}.
If a CAPTCHA appears, return {"rows": [], "error": "captcha_encountered"}.

Return as JSON exactly matching this structure:
{"rows": [{"commodity": "Beras Medium", "price": 12500, "unit": "per kg", "city": "Bandung", "province": "Jawa Barat", "date": "25/03/2025"}]}
"""

# Map raw KEMENDAG commodity names → normalised internal names
_COMMODITY_MAP: dict[str, str] = {
    "beras medium": "beras",
    "beras premium": "beras",
    "beras": "beras",
    "cabai merah keriting": "cabai",
    "cabai merah besar": "cabai",
    "cabai rawit merah": "cabai",
    "cabai": "cabai",
    "jagung": "jagung",
    "kedelai": "kedelai",
    "minyak goreng curah": "minyak_goreng",
    "minyak goreng kemasan": "minyak_goreng",
    "minyak goreng": "minyak_goreng",
    "telur ayam ras": "telur",
    "telur ayam": "telur",
    "bawang merah": "bawang_merah",
    "bawang putih": "bawang_putih",
    "gula pasir": "gula",
    "daging sapi": "daging_sapi",
    "daging ayam": "daging_ayam",
}


def _normalise_commodity(raw: str) -> str:
    key = raw.strip().lower()
    for pattern, name in _COMMODITY_MAP.items():
        if pattern in key:
            return name
    return key.replace(" ", "_")


def _parse_price(raw: object) -> Decimal | None:
    """Convert raw price value (string or number) to Decimal. Returns None on failure."""
    try:
        # Strip common Indonesian formatting: dots as thousands separator, commas as decimal
        cleaned = str(raw).replace("Rp", "").replace(".", "").replace(",", ".").strip()
        return Decimal(cleaned)
    except (InvalidOperation, ValueError):
        return None


def _parse_date(raw: object) -> date:
    """Parse date string to date, falling back to today."""
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d %b %Y"):
        try:
            return datetime.strptime(str(raw).strip(), fmt).date()
        except ValueError:
            continue
    return date.today()


async def scrape_kemendag_prices(province: str) -> list[PriceRecord]:
    """
    Scrape wholesale commodity prices from KEMENDAG for the given province.

    Returns an empty list (not an exception) if the scrape fails, so the
    agent loop can continue with whatever data is already in the DB.
    """
    client = TinyFishClient()
    try:
        rows = await client.extract_table(
            SOURCE_URL,
            schema={},
            goal_override=_EXTRACTION_GOAL,
            browser_profile="stealth",
            proxy_country="US",
        )
    except TinyFishError as exc:
        logger.warning("KEMENDAG scrape failed: %s", exc)
        return []

    now = datetime.now(timezone.utc)
    records: list[PriceRecord] = []

    for row in rows:
        row_province: str = str(row.get("province", "")).strip()

        # Filter to the requested province (case-insensitive partial match)
        if province.lower() not in row_province.lower():
            continue

        price_val = _parse_price(row.get("price"))
        if price_val is None or price_val <= 0:
            continue

        records.append(
            PriceRecord(
                commodity=_normalise_commodity(str(row.get("commodity", ""))),
                province=row_province or province,
                city=str(row.get("city", province)).strip() or province,
                price=price_val,
                currency="IDR",
                unit=str(row.get("unit", "per kg")).strip() or "per kg",
                price_level=PriceLevel.wholesale,
                source_url=SOURCE_URL,
                scraped_at=now,
                date_of_price=_parse_date(row.get("date")),
            )
        )

    logger.info("KEMENDAG: scraped %d price records for %s", len(records), province)
    return records
