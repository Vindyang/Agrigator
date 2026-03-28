"""
BBPOPT pest & disease alert scraper.

Source: Balai Besar Peramalan Organisme Pengganggu Tumbuhan
URL: https://bbpopt.tanamanpangan.pertanian.go.id/banner/peramalan

Uses TinyFish structured extraction with a detailed goal (stealth + ID proxy)
to handle the legacy ASP portal. Returns structured JSON directly — no HTML parsing.

Returns validated AlertRecord models — never raw dicts.
"""

import logging
from datetime import datetime, timezone

from backend.models.alert import AlertRecord, AlertType, Severity
from backend.scrapers.tinyfish_client import TinyFishClient, TinyFishError

logger = logging.getLogger(__name__)

BBPOPT_URL = "https://bbpopt.tanamanpangan.pertanian.go.id/banner/peramalan"

_EXTRACTION_GOAL = """
Extract pest and disease forecast data from the BBPOPT portal.

Steps:
1. If a cookie banner, login prompt, or privacy notice appears, dismiss it.
2. The exact pest forecast data (Organisme Pengganggu Tumbuhan / OPT) is contained inside a PDF report linked on the page. Look for the link to the newest OPT forecast PDF report, and CLICK IT to open the PDF. 
   IMPORTANT: If the PDF opens in Google Drive but says "File not found", "No Preview Available", or shows an error, GO BACK to the previous page and click the second newest report. Repeat this until you find a report that successfully loads.
3. Inside the successful PDF, locate the forecast tables. The tables have headings for the commodity (e.g. "PRAKIRAAN OPT PADI MT 2025-2026") and sub-headings (e.g., in blue) indicating the specific pest (e.g. "PBP" for Penggerek Batang Padi).
4. The table columns are "No.", "Provinsi", "Minimum", "Rata-rata", and "Maksimum".
5. For each row in these tables, extract the data. Follow these rules:
   - province: use the "Provinsi" column.
   - commodity: use the commodity name from the section header.
   - pest_name: use the abbreviation from the table header.
   - max_area: extract the raw number from the "Maksimum" column (as an integer). Remove any commas or dots.
   
Skip header rows. Extract all visible data rows.
If the page has no data or the table is empty, return {"rows": []}.

Return as JSON exactly matching this structure:
{"rows": [{"province": "Jawa Barat", "pest_name": "PBP", "max_area": 6200, "commodity": "Padi"}]}
"""

_SEVERITY_MAP: dict[str, Severity] = {
    "ringan": Severity.low,
    "sedang": Severity.medium,
    "berat": Severity.high,
    "sangat berat": Severity.critical,
    "tinggi": Severity.high,
    "rendah": Severity.low,
}

_PEST_MAP: dict[str, str] = {
    "wereng batang coklat": "Wereng Batang Coklat (Brown Planthopper / BPH)",
    "wereng coklat": "Wereng Batang Coklat (Brown Planthopper / BPH)",
    "blas": "Blas (Blast Disease)",
    "ulat grayak": "Ulat Grayak (Armyworm)",
    "penggerek batang padi": "Penggerek Batang Padi (Rice Stem Borer)",
    "penggerek batang": "Penggerek Batang (Stem Borer)",
    "hawar daun bakteri": "Hawar Daun Bakteri (Bacterial Leaf Blight / BLB)",
    "tungro": "Tungro (Rice Tungro Disease)",
    "busuk pelepah": "Busuk Pelepah (Sheath Blight)",
    "tikus": "Tikus (Rats / Rodents)",
}


def _normalise_pest(raw: str) -> str:
    key = raw.strip().lower()
    for pattern, display in _PEST_MAP.items():
        if pattern in key:
            return display
    return raw.strip().title()


def _normalise_severity(raw: str) -> Severity:
    key = raw.strip().lower()
    for token, sev in _SEVERITY_MAP.items():
        if token in key:
            return sev
    return Severity.medium


async def scrape_bbpopt_alerts() -> list[AlertRecord]:
    """
    Scrape OPT pest & disease forecasts from the BBPOPT portal via TinyFish.

    Returns an empty list on failure so the agent loop can still proceed
    with MONITOR/HOLD when pest data is unavailable.
    """
    alert_schema = {
        "type": "object",
        "properties": {
            "province": {"type": "string"},
            "commodity": {"type": "string"},
            "pest_name": {"type": "string"},
            "max_area": {
                "type": "integer", 
                "description": "The raw maximum area affected in hectares. Do NOT use strings like 'berat'."
            }
        },
        "required": ["province", "commodity", "pest_name", "max_area"]
    }

    client = TinyFishClient()
    try:
        rows = await client.extract_table(
            BBPOPT_URL,
            schema=alert_schema,
            goal_override=_EXTRACTION_GOAL,
            browser_profile="stealth",
            proxy_country="US",
        )
    except TinyFishError as exc:
        logger.warning("BBPOPT scrape failed: %s", exc)
        return []

    now = datetime.now(timezone.utc)
    records: list[AlertRecord] = []

    for row in rows:
        province = str(row.get("province", "")).strip()
        if not province:
            continue

        pest_name = _normalise_pest(str(row.get("pest_name", "")))
        severity = _normalise_severity(str(row.get("severity", "")))
        regency = row.get("regency") or None
        if isinstance(regency, str):
            regency = regency.strip() or None

        records.append(
            AlertRecord(
                alert_type=AlertType.pest,
                province=province,
                regency=regency,
                severity=severity,
                pest_name=pest_name,
                description=(
                    f"{pest_name} outbreak forecast for "
                    f"{regency or province} (severity: {severity.value})"
                ),
                source_url=BBPOPT_URL,
                published_at=now,
                scraped_at=now,
            )
        )

    logger.info("BBPOPT: scraped %d pest alert records", len(records))
    return records
