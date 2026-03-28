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
Extract pest and disease forecast data from this Indonesian government agricultural portal (BBPOPT).

This is a legacy government website and may load slowly. Wait for the main content to fully
render before extracting. Do not attempt to extract until the page body is visible.

Steps:
1. If a cookie banner, login prompt, or privacy notice appears, dismiss it.
2. If a CAPTCHA appears, stop immediately and return {"rows": [], "error": "captcha_encountered"}.
3. Look for a table or list containing OPT (Organisme Pengganggu Tumbuhan) pest forecast data.
   The table typically has columns for: province (Provinsi), regency (Kabupaten/Kota),
   commodity (Komoditas), pest name (Nama OPT), and attack severity (Tingkat Serangan).
4. For each row in the forecast table, extract:
   - province: the province name in Indonesian (e.g. "Jawa Barat")
   - regency: the regency or city name (e.g. "Indramayu"), or null if not shown
   - pest_name: the pest or disease name exactly as shown (e.g. "Wereng Batang Coklat")
   - severity: the severity level exactly as shown (e.g. "ringan", "sedang", "berat", "sangat berat")
   - commodity: the affected crop (e.g. "Padi", "Jagung"), or null if not shown

Skip header rows. Extract all visible data rows.
If the page has no data or the table is empty, return {"rows": []}.

Return as JSON exactly matching this structure:
{"rows": [{"province": "Jawa Barat", "regency": "Indramayu", "pest_name": "Wereng Batang Coklat", "severity": "berat", "commodity": "Padi"}]}
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
    client = TinyFishClient()
    try:
        rows = await client.extract_table(
            BBPOPT_URL,
            schema={},
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
