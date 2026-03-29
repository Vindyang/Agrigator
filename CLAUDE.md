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

Required environment variables (set manually or via `.env`):
- `GROQ_API_KEY` — required
- `OPENAI_API_KEY` (optional, not used in current code)
- `TINYFISH_API_KEY` / `TINYFISH_API_URL` — no longer required (TinyFish removed)
- `DATABASE_URL` (default: `postgresql+asyncpg://postgres:postgres@localhost:5432/agrisentinel`)
- `REDIS_URL` (default: `redis://localhost:6379`)

Seed demo data (guarantees URGENT_ACTION on first run):
```bash
python -m scripts.seed_demo_data
```

## Running the Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
npm run build
npm run lint
npm run typecheck  # tsc --noEmit
```

Frontend env var: `NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:8000`)

## Debug & Test Scripts (at repo root)

- `python test_bbpopt.py` — unit test for BBPOPT scraper
- `python debug_bbpopt.py` / `debug_kemendag.py` / `debug_news.py` — interactive TinyFish API tests for each scraper

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
Uses **Groq API** (`llama-3.3-70b-versatile`) via OpenAI-compatible endpoint (`https://api.groq.com/openai/v1`). Advisory generated in English, then translated to Bahasa Indonesia with farmer-friendly language. `OPENAI_API_KEY` is loaded by config but not used.

### 4 Target Data Sources
| Scraper file | Source | Method | Data |
|---|---|---|---|
| `kemendag_prices.py` | `api-sp2kp.kemendag.go.id/report/api/hnt` | httpx (JSON API) | Wholesale market prices |
| `weather.py` | `api.open-meteo.com` | httpx (JSON API) | 72h weather forecasts |
| `bbpopt_alerts.py` | `bbpopt.tanamanpangan.pertanian.go.id` | httpx + BeautifulSoup (find PDF) + pdfplumber (extract tables) | Pest & disease alerts |
| `pertanian_news.py` | pertanian.go.id + Google News RSS | httpx + BeautifulSoup / RSS | Agricultural news |

### Key Provinces Monitored
Jawa Barat (`-6.9175, 107.6191`), Jawa Tengah (`-7.1510, 110.1403`), Jawa Timur (`-7.5361, 112.2384`), Sulawesi Selatan (`-5.1477, 119.4327`), Sumatera Utara (`3.5952, 98.6722`)

### Frontend (`frontend/`)
Next.js 16.1.7 App Router with React 19 + Tailwind CSS 4 + shadcn/ui.

Key components:
- `ChatFeed.tsx` — real-time advisory feed; WebSocket primary, 25s polling fallback with exponential backoff reconnect
- `AdvisoryCard.tsx` — signal badge, mini SVG charts (7-day price + 72h weather), feedback buttons
- `StatusBar.tsx` — province selector, Run Agent button, connection status
- `lib/api.ts` — typed API client (`AdvisoryApi`, `HealthApi`) and WebSocket URL helper

## Incomplete Parts
- `.env.example` — not yet created
- `docker-compose.yml` — not yet created
- Formal test suite — only debug scripts exist at repo root

## Data Models
All in `backend/models/`. SQLModel ORM + Pydantic schemas in the same file per model.
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
