# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**AgriSentinel** — Autonomous web intelligence agent for Indonesian smallholder farmers. Monitors wholesale market prices, weather forecasts, pest alerts, and agricultural news; synthesizes compound signals via LLM; delivers advisories via real-time WebSocket chat UI.

Built for the TinyFish x OpenAI Hackathon (1-day build). Speed and demoability over production polish.

## Running the Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Required environment variables (copy from `.env.example` when created, or set manually):
- `OPENAI_API_KEY`, `GROQ_API_KEY`, `TINYFISH_API_KEY`, `TINYFISH_API_URL`
- `DATABASE_URL` (defaults: `postgresql+asyncpg://user:pass@localhost:5432/agrisentinel`)
- `REDIS_URL` (defaults: `redis://localhost:6379`)

Seed demo data (guarantees URGENT_ACTION on first run):
```bash
python scripts/seed_demo_data.py
```

## Architecture

### Data Pipeline
1. **Scrapers** collect raw data from 4 Indonesian government sources (see below)
2. **Agent orchestrator** (`backend/agents/orchestrator.py`) runs the full pipeline: fetch → detect anomalies → research loop → compound signal → generate advisory → broadcast
3. **Scheduler** (`backend/scheduler.py`) fires the agent every 6h per province; refreshes weather every 1h
4. **WebSocket** (`WS /ws/advisories`) fans out new advisories to all connected UI clients via Redis pub/sub

### Signal Logic (`backend/agents/signal_detector.py`)
- Anomaly = price >8% from 7-day rolling average
- `URGENT_ACTION`: anomaly AND (severe weather OR pest alert)
- `OPPORTUNITY`: price at seasonal low AND favourable weather
- `MONITOR`: single anomaly, no corroboration
- `HOLD`: nothing detected

### LLM
Uses **Groq API** (`llama-3.3-70b-versatile`) via OpenAI-compatible endpoint — not direct OpenAI. Advisory generated in English, then translated to Bahasa Indonesia with farmer-friendly language.

### TinyFish Client
Lives at `agrisentinel/backend/scrapers/tinyfish_client.py` (note: different directory from `backend/`). This is the browser automation layer used by all scrapers for JS-rendered pages. Methods: `fetch_page`, `extract_table`, `extract_pdf`, `search_web`. All have 3-attempt retry with exponential backoff.

### 4 Target Data Sources
| Scraper file | Source | Data |
|---|---|---|
| `kemendag_prices.py` | KEMENDAG spk2kp | Wholesale market prices |
| `weather.py` | BMKG + Open-Meteo fallback | 72h weather forecasts |
| `bbpopt_alerts.py` | bbpopt.tanamanpangan.pertanian.go.id/banner/peramalan | Pest & disease alerts |
| `pertanian_news.py` | pertanian.go.id/?show=news&act=view_all&cat=2 | Agricultural news |

### Key Provinces Monitored
Jawa Barat (`-6.9175, 107.6191`), Jawa Tengah (`-7.1510, 110.1403`), Jawa Timur (`-7.5361, 112.2384`), Sulawesi Selatan (`-5.1477, 119.4327`), Sumatera Utara (`3.5952, 98.6722`)

## Incomplete Parts (as of last check)
- `backend/scrapers/weather.py` — stub, returns neutral defaults
- `backend/scrapers/kemendag_prices.py` — not yet created
- `backend/scrapers/bbpopt_alerts.py` — not yet created
- `backend/scrapers/pertanian_news.py` — not yet created
- `frontend/` — Next.js UI not yet created
- `docker-compose.yml` — not yet created

## Data Models
All in `backend/models/`. ORM + Pydantic schemas in the same file per model.
- `PriceRecord`: commodity, province, city, price (`Decimal(10,4)` IDR), unit, price_level, source_url
- `AlertRecord`: alert_type (pest/disease/weather), severity, pest_name, province, regency
- `Advisory`: signal_category, advisory_text_en, advisory_text_id, confidence, sources (JSON URLs), agent_trace (JSON full tool call history)
- Join tables: `AdvisoryPriceLink`, `AdvisoryAlertLink`

## API Routes
- `GET /health`
- `POST /agent/run` → `{province, commodity?}` → triggers agent, returns advisory
- `GET /advisories?limit=20&province=`
- `PATCH /advisories/{id}/feedback` → `{helpful: bool}`
- `WS /ws/advisories`
