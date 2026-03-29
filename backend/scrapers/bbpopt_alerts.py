"""
BBPOPT pest & disease alert scraper.

Source: Balai Besar Peramalan Organisme Pengganggu Tumbuhan
URL: https://bbpopt.tanamanpangan.pertanian.go.id/banner/peramalan

Strategy:
1. Fetch the portal page with httpx
2. Parse HTML with BeautifulSoup to find the newest OPT forecast PDF link
3. Download the PDF and extract tables with pdfplumber
4. Parse province/pest/max_area rows into AlertRecord models

Returns [] on any failure so the agent loop can proceed without pest data.
"""

import io
import logging
import re
from datetime import datetime, timezone

import httpx
import pdfplumber
from bs4 import BeautifulSoup

from backend.models.alert import AlertRecord, AlertType, Severity

logger = logging.getLogger(__name__)

BBPOPT_URL = "https://bbpopt.tanamanpangan.pertanian.go.id/banner/peramalan"
BBPOPT_BASE = "https://bbpopt.tanamanpangan.pertanian.go.id"

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
}

# Indonesian province names that appear in BBPOPT reports
_KNOWN_PROVINCES = {
    "jawa barat", "jawa tengah", "jawa timur", "sulawesi selatan",
    "sumatera utara", "sumatera selatan", "kalimantan barat",
    "kalimantan selatan", "kalimantan tengah", "kalimantan timur",
    "sulawesi tengah", "sulawesi tenggara", "sulawesi utara",
    "nusa tenggara barat", "nusa tenggara timur", "maluku",
    "papua", "banten", "dki jakarta", "yogyakarta", "aceh",
    "bengkulu", "jambi", "lampung", "riau", "kepulauan riau",
    "bangka belitung", "gorontalo", "maluku utara",
}

_PEST_MAP: dict[str, str] = {
    "wereng batang coklat": "Wereng Batang Coklat (Brown Planthopper / BPH)",
    "wereng coklat": "Wereng Batang Coklat (Brown Planthopper / BPH)",
    "blas": "Blas (Blast Disease)",
    "ulat grayak": "Ulat Grayak (Armyworm)",
    "penggerek batang padi": "Penggerek Batang Padi (Rice Stem Borer)",
    "penggerek batang": "Penggerek Batang (Stem Borer)",
    "pbp": "Penggerek Batang Padi (Rice Stem Borer)",
    "hawar daun bakteri": "Hawar Daun Bakteri (Bacterial Leaf Blight / BLB)",
    "hdb": "Hawar Daun Bakteri (Bacterial Leaf Blight / BLB)",
    "tungro": "Tungro (Rice Tungro Disease)",
    "busuk pelepah": "Busuk Pelepah (Sheath Blight)",
    "tikus": "Tikus (Rats / Rodents)",
    "wbc": "Wereng Batang Coklat (Brown Planthopper / BPH)",
    "bph": "Wereng Batang Coklat (Brown Planthopper / BPH)",
}


def _normalise_pest(raw: str) -> str:
    key = raw.strip().lower()
    for pattern, display in _PEST_MAP.items():
        if pattern in key:
            return display
    return raw.strip().title()


def _severity_from_area(max_area: int) -> Severity:
    """Infer severity from hectares affected."""
    if max_area >= 10_000:
        return Severity.critical
    if max_area >= 5_000:
        return Severity.high
    if max_area >= 1_000:
        return Severity.medium
    return Severity.low


def _find_pdf_links(html: str) -> list[str]:
    """Return absolute URLs for PDF links found on the BBPOPT page."""
    soup = BeautifulSoup(html, "lxml")
    urls: list[str] = []
    for a in soup.find_all("a", href=True):
        href: str = a["href"]
        if ".pdf" in href.lower() or "peramalan" in href.lower():
            if href.startswith("http"):
                urls.append(href)
            elif href.startswith("/"):
                urls.append(BBPOPT_BASE + href)
            else:
                urls.append(BBPOPT_BASE + "/" + href)
    return urls


def _extract_rows_from_pdf(pdf_bytes: bytes) -> list[dict]:
    """
    Extract province/pest/max_area rows from a BBPOPT OPT forecast PDF.

    The PDFs contain tables with columns: No., Provinsi, Minimum, Rata-rata, Maksimum.
    Section headers identify the pest name (e.g. "WBC", "Blast", "Penggerek Batang").
    """
    rows: list[dict] = []
    current_pest: str = "Unknown"

    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    for row in table:
                        if not row:
                            continue
                        cells = [str(c).strip() if c else "" for c in row]

                        # Detect pest section headers (short rows or header-like text)
                        joined = " ".join(cells).lower()
                        for pest_key in _PEST_MAP:
                            if pest_key in joined and len([c for c in cells if c]) <= 3:
                                current_pest = _normalise_pest(joined)
                                break

                        # Data row: first cell is a number, second is a province name
                        if len(cells) < 4:
                            continue
                        province_candidate = cells[1].strip().lower()
                        if province_candidate not in _KNOWN_PROVINCES:
                            continue
                        # Maksimum is the last numeric column
                        max_raw = cells[-1].replace(",", "").replace(".", "").strip()
                        try:
                            max_area = int(float(max_raw))
                        except (ValueError, TypeError):
                            continue
                        if max_area <= 0:
                            continue

                        rows.append({
                            "province": cells[1].strip().title(),
                            "pest_name": current_pest,
                            "max_area": max_area,
                        })
    except Exception as exc:
        logger.warning("pdfplumber extraction failed: %s", exc)

    return rows


async def scrape_bbpopt_alerts() -> list[AlertRecord]:
    """
    Scrape OPT pest & disease forecasts from the BBPOPT portal.

    Fetches the page, finds the newest PDF, downloads and parses it.
    Returns [] on failure so the agent loop can proceed with MONITOR/HOLD.
    """
    async with httpx.AsyncClient(headers=_HEADERS, follow_redirects=True, timeout=20.0) as client:
        # Step 1: fetch portal page
        try:
            resp = await client.get(BBPOPT_URL)
            resp.raise_for_status()
        except Exception as exc:
            logger.warning("BBPOPT portal fetch failed: %s", exc)
            return []

        pdf_urls = _find_pdf_links(resp.text)
        if not pdf_urls:
            logger.warning("BBPOPT: no PDF links found on %s", BBPOPT_URL)
            return []

        # Step 2: try PDFs in order until one downloads successfully
        pdf_bytes: bytes | None = None
        used_url = ""
        for url in pdf_urls[:3]:
            try:
                pdf_resp = await client.get(url, timeout=30.0)
                pdf_resp.raise_for_status()
                content_type = pdf_resp.headers.get("content-type", "")
                if "pdf" in content_type or pdf_resp.content[:4] == b"%PDF":
                    pdf_bytes = pdf_resp.content
                    used_url = url
                    break
            except Exception as exc:
                logger.warning("BBPOPT PDF download failed (%s): %s", url, exc)
                continue

    if not pdf_bytes:
        logger.warning("BBPOPT: could not download any PDF")
        return []

    # Step 3: extract table rows from PDF
    raw_rows = _extract_rows_from_pdf(pdf_bytes)
    if not raw_rows:
        logger.warning("BBPOPT: no rows extracted from PDF %s", used_url)
        return []

    now = datetime.now(timezone.utc)
    records: list[AlertRecord] = []

    for row in raw_rows:
        province = row.get("province", "").strip()
        if not province:
            continue
        pest_name = _normalise_pest(row.get("pest_name", ""))
        max_area: int = row.get("max_area", 0)
        severity = _severity_from_area(max_area)

        records.append(
            AlertRecord(
                alert_type=AlertType.pest,
                province=province,
                regency=None,
                severity=severity,
                pest_name=pest_name,
                description=(
                    f"{pest_name} forecast for {province} "
                    f"(max area: {max_area:,} ha, severity: {severity.value})"
                ),
                source_url=used_url or BBPOPT_URL,
                published_at=now,
                scraped_at=now,
            )
        )

    logger.info("BBPOPT: %d pest alert records from %s", len(records), used_url)
    return records
