You are helping build AgriSentinel — an autonomous web intelligence agent for Indonesian smallholder farmers, built for the TinyFish x OpenAI Hackathon in Singapore. This is a 1-day hackathon build. Speed and demoability matter more than production polish.

## Project Overview

AgriSentinel monitors live agricultural market prices, weather forecasts, and crop disease alerts across Indonesia, synthesizes compound signals using GPT-4o via the OpenAI Agents SDK, and delivers actionable advisories via a real-time web chat UI.

## Problem Being Solved

Indonesian smallholder farmers produce the majority of the country's food staples — rice, corn, soybeans, chili, and palm oil — but have no integrated access to real-time market prices, weather, and pest alerts. AgriSentinel autonomously collects and synthesizes these signals, then delivers plain-language advisories through a web chat interface. The three core pain points are:

- Market opacity: Wholesale price data from PIHPS and Kementan is fragmented across government portals in inconsistent formats
- Weather risk: BMKG forecasts exist but are not integrated with agricultural decision-making
- Pest and disease threats: BBPOPT publishes OPT (Organisme Pengganggu Tumbuhan) forecasts but they are buried in legacy government portals with no synthesis layer

## Technical Stack

- Web agent / browser automation: TinyFish API (handles JS-rendered pages, anti-bot portals, PDF extraction)
- AI reasoning + synthesis: OpenAI GPT-4o via the OpenAI Agents SDK (Python)
- Agent orchestration: OpenAI Agents SDK — tool definitions, multi-hop loop, state management
- Backend API: FastAPI (Python, async)
- Database: PostgreSQL (advisory history, price records, alert log)
- Cache: Redis (latest values for real-time WebSocket push)
- Scheduling: APScheduler (timed scraper runs — prices every 6h, weather every 1h)
- Frontend: Next.js + Tailwind CSS (real-time chat UI via WebSocket)
- Containerisation: Docker + docker-compose (PostgreSQL + Redis + backend together locally)

## Data Sources

### Prices

- PIHPS Nasional (Pusat Informasi Harga Pangan Strategis) — hargapangan.id
  - Daily wholesale and retail prices for strategic food commodities (rice, chili, onion, egg, cooking oil)
  - Covers all provinces and major cities across Indonesia
  - Dynamic JS-rendered portal, needs TinyFish
- BPS (Badan Pusat Statistik) — bps.go.id/subject/9
  - Monthly producer prices and food price indices by province
  - Mix of HTML tables and downloadable Excel files
- Kementan price monitoring — pertanian.go.id
  - Ministry of Agriculture commodity price data and market reports

### Weather

- BMKG (Badan Meteorologi, Klimatologi, dan Geofisika) — bmkg.go.id
  - Official Indonesian meteorological agency
  - 72h weather forecast by province and regency (kabupaten)
  - Also use Open-Meteo API as fallback (open-meteo.com — free, no key needed)
- Key coordinates to monitor:
  - West Java (rice belt): -6.9175, 107.6191
  - Central Java (rice + corn): -7.1510, 110.1403
  - East Java (soybean + sugarcane): -7.5361, 112.2384
  - South Sulawesi (rice + corn): -5.1477, 119.4327
  - North Sumatra (palm oil + rubber): 3.5952, 98.6722

### Pest & Disease Alerts

- BBPOPT (Balai Besar Peramalan Organisme Pengganggu Tumbuhan) — bbpopt.tanamanpangan.pertanian.go.id
  - Indonesia's official plant pest forecasting centre under Kementan
  - Publishes seasonal OPT attack forecasts for rice, corn, soybeans, cassava
  - Key pests to monitor: Wereng Batang Coklat (Brown Planthopper / BPH), blast disease (blas), armyworm (ulat grayak)
  - Legacy ASP-style government portal — needs TinyFish
- IPPC Indonesia — ippc.int/en/countries/indonesia/pestreports/
  - Official Indonesian pest reports submitted to the International Plant Protection Convention
  - English language, consistently structured HTML — easier to parse than BBPOPT
- Antara News agriculture section — antaranews.com/tag/pertanian
  - Indonesian state news agency — fast reporting on pest outbreaks and crop disasters in Bahasa Indonesia
- Kementan press releases — pertanian.go.id
  - Ministry of Agriculture announcements on disease outbreaks and emergency pest responses

## Agent Logic Flow

1. SCHEDULE TRIGGER — APScheduler fires agent run (every 6h or on-demand via the web UI)
2. DATA COLLECTION — TinyFish scrapes all configured Indonesian sources in parallel
3. DELTA ANALYSIS — Compare new prices vs 7-day rolling average; flag anomalies >8%
4. CAUSAL RESEARCH LOOP — GPT-4o detects anomaly → instructs TinyFish to search Antara News and Kementan for causal explanation → up to 3 follow-up search hops
5. COMPOUND SIGNAL EVALUATION — Evaluates price + weather + disease together → URGENT_ACTION / OPPORTUNITY / MONITOR / HOLD
6. ADVISORY GENERATION — Plain-language advisory in English, then translated to Bahasa Indonesia
7. WEBSOCKET DELIVERY — Advisory pushed to all connected chat UI clients in real time
8. FEEDBACK CAPTURE — User can click thumbs up/down on each advisory card to calibrate future thresholds

## Compound Signal Rules

- Price movement >8% from 7-day avg AND severe BMKG weather alert (precipitation >70mm/day or wind >50km/h within 72h) → URGENT_ACTION
- Price movement >8% AND BBPOPT pest alert or IPPC report within the same province → URGENT_ACTION
- Price at 30-day seasonal low AND favourable planting weather (no rain alert, humidity normal) → OPPORTUNITY
- Single anomaly signal only, no corroborating signals → MONITOR
- No anomalies detected → HOLD

## Pydantic / DB Data Models

PriceRecord:

- id, commodity (str), province (str), city (str), price (DECIMAL 10,4), currency="IDR", unit (str — e.g. "per kg"), price_level (wholesale/retail), source_url, scraped_at, date_of_price

AlertRecord:

- id, alert_type (pest/disease/weather), province (str), regency (str, nullable), severity (low/medium/high/critical), pest_name (str, nullable — e.g. "Wereng Batang Coklat"), description, source_url, published_at, scraped_at

Advisory:

- id, signal_category (URGENT_ACTION/OPPORTUNITY/MONITOR/HOLD), commodity, province, advisory_text_en, advisory_text_id (Bahasa Indonesia), confidence (0.0–1.0), sources (JSON array of URLs), price_change_pct (nullable float), expires_at, created_at, feedback_helpful (nullable int), agent_trace (JSON — full tool call history for provenance)

## Full Project Structure

agrisentinel/
├── backend/
│ ├── main.py # FastAPI app, all routes, WebSocket /ws/advisories, lifespan
│ ├── config.py # Pydantic-settings: all env vars in one place
│ ├── database.py # SQLAlchemy async engine + session factory + Base
│ ├── cache.py # Redis async client (redis.asyncio)
│ ├── scheduler.py # APScheduler — registers and fires agent run jobs
│ ├── models/
│ │ ├── **init**.py
│ │ ├── advisory.py # Advisory ORM model + Pydantic schema
│ │ ├── price.py # PriceRecord ORM model + Pydantic schema
│ │ └── alert.py # AlertRecord ORM model + Pydantic schema
│ ├── agents/
│ │ ├── **init**.py
│ │ ├── orchestrator.py # OpenAI Agents SDK agent definition + Runner.run()
│ │ ├── tools.py # Tool functions: get_prices, get_weather, get_alerts, search_news
│ │ ├── signal_detector.py # price_anomaly(), compound_signal(), SignalCategory enum
│ │ └── advisory_generator.py # generate_advisory(), translate_advisory()
│ └── scrapers/
│ ├── **init**.py
│ ├── tinyfish_client.py # TinyFish async wrapper: fetch_page, extract_table, extract_pdf, search_web
│ ├── weather.py # BMKG + Open-Meteo 72h forecast for Indonesian provinces
│ ├── pihps_prices.py # PIHPS Nasional wholesale/retail price scraper
│ ├── bps_prices.py # BPS producer price index scraper
│ ├── bbpopt_alerts.py # BBPOPT OPT pest forecast scraper
│ ├── ippc_alerts.py # IPPC Indonesia pest report scraper
│ └── news_search.py # Antara News + Kementan causal research search
├── frontend/
│ ├── pages/
│ │ └── index.tsx # Main chat UI page
│ ├── components/
│ │ ├── AdvisoryCard.tsx # Signal badge + advisory text + confidence bar + sources
│ │ ├── StatusBar.tsx # Last run time, provinces monitored, advisory count
│ │ └── ChatFeed.tsx # Real-time WebSocket advisory feed
│ └── styles/
│ └── globals.css
├── scripts/
│ └── seed_demo_data.py # Seeds mock data so agent fires URGENT_ACTION on first demo run
├── docker-compose.yml # PostgreSQL + Redis + backend + frontend for local dev
├── .env.example # All required env vars listed with descriptions
└── README.md # Setup, run instructions, demo script

## Required Environment Variables

OPENAI_API_KEY=
TINYFISH_API_KEY=
TINYFISH_API_URL=
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/agrisentinel
REDIS_URL=redis://localhost:6379
APP_ENV=development

## Key Implementation Details

### TinyFish Client (tinyfish_client.py)

TinyFish is a browser automation API for web agents. Model it as an async REST client where you POST a job (url + extraction instructions) and GET the structured result. Build it as a clean abstraction with these async methods:

- fetch_page(url: str) → str (raw HTML)
- extract_table(url: str, schema: dict) → list[dict] (structured table data matching the schema)
- extract_pdf(url: str) → str (full extracted text)
- search_web(query: str) → list[dict] (search results: title, url, snippet)
  All methods must include retry logic (3 attempts, exponential backoff), 30s timeout, and structured error handling. If TinyFish API documentation is available at runtime, implement against the real endpoints. Otherwise build the abstraction cleanly so it can be swapped in without changing any scraper code.

### OpenAI Agents SDK (orchestrator.py)

Use the openai-agents Python package (pip install openai-agents). Define the agent with:

- A detailed system prompt specifying its role as an Indonesian agricultural intelligence agent
- Tool functions imported from tools.py
- Runner.run() to execute the multi-hop loop
- Store the full tool call history in Advisory.agent_trace for provenance

The system prompt must instruct the agent to:

1. Call get_prices, get_weather, and get_alerts for the target Indonesian province first
2. Run delta analysis on price data against 7-day rolling average
3. If anomaly detected and cause is unclear, call search_news targeting Antara News and Kementan, up to 3 iterations
4. Evaluate compound signals using the rules defined above
5. Generate advisory in English first, then translate to Bahasa Indonesia
6. Return structured JSON matching the Advisory schema exactly

### Signal Detection (signal_detector.py)

Implement:

- price_anomaly(current: float, history: list[float]) → tuple[bool, float]: returns (is_anomaly, pct_change). Anomaly threshold: >8% deviation from 7-day average
- compound_signal(price_anomalies: list, weather_data: dict, alerts: list) → SignalCategory: applies the compound rules above
- SignalCategory enum: URGENT_ACTION, OPPORTUNITY, MONITOR, HOLD

### Advisory Translation (advisory_generator.py)

After generating the English advisory, call GPT-4o with:
"Translate the following agricultural advisory into Bahasa Indonesia. Use simple, clear language appropriate for Indonesian farmers with basic literacy. Preserve all numbers, commodity names (beras=rice, jagung=corn, kedelai=soybean, cabai=chili), percentages, and action verbs accurately. Keep the translation concise and under 250 words."

### FastAPI Routes (main.py)

- GET /health → {status, db, redis, last_run}
- POST /agent/run → {province, commodity (optional)} → trigger agent run, return advisory
- GET /advisories?limit=20&province= → latest advisories from DB filtered by province
- WS /ws/advisories → WebSocket: push new Advisory objects in real time to all connected clients

### Frontend Chat UI

- Left sidebar: StatusBar showing last run timestamp, provinces monitored count, active advisory count, and a "Jalankan Agen" (Run Agent Now) button that hits POST /agent/run
- Main panel: ChatFeed receiving real-time advisory cards via WebSocket
- AdvisoryCard shows:
  - signal_category badge, colour-coded: red = URGENT_ACTION, green = OPPORTUNITY, yellow = MONITOR, gray = HOLD
  - Commodity name + province
  - Advisory text defaulting to Bahasa Indonesia, with a toggle to English
  - Confidence percentage displayed as a progress bar
  - Collapsible list of source URLs with timestamps
  - Thumbs up / thumbs down feedback buttons that hit PATCH /advisories/{id}/feedback
- Province filter dropdown: Jawa Barat, Jawa Tengah, Jawa Timur, Sulawesi Selatan, Sumatera Utara, All Provinces
- No authentication needed for hackathon

### Demo Seed Data (seed_demo_data.py)

Pre-load the database with data that guarantees URGENT_ACTION fires on the very first demo run without depending on live scrapers:

- 7 days of beras (rice) price history for Jawa Barat — gradual upward trend, final entry at +16% spike vs 7-day average (price: IDR 14,000/kg rising to IDR 16,240/kg)
- BMKG-style weather alert: heavy rainfall forecast for Jawa Barat within 72h (precipitation: 85mm/day, severity: high)
- BBPOPT pest alert: Wereng Batang Coklat (Brown Planthopper) outbreak in Indramayu regency, Jawa Barat, severity: high
- These three signals together trigger URGENT_ACTION and produce a compelling demo advisory about the Jawa Barat rice situation

## Implementation Constraints

- All backend code must use async/await throughout — no blocking calls
- All DB operations via SQLAlchemy async session
- All monetary values stored as DECIMAL(10,4) in IDR
- No hardcoded secrets — all from environment variables via config.py
- Each scraper must return validated Pydantic models, not raw dicts
- Every advisory stored with full source provenance (URLs + timestamps)
- PATCH /advisories/{id}/feedback → {helpful: bool} → update Advisory.feedback_helpful

## Do Not Build

- SMS delivery (Twilio SMS)
- IVR voice calls (Twilio Voice / WaveNet TTS / Whisper ASR)
- WhatsApp integration
- Offline mobile app or kiosk mode
- User authentication
- Any CI/CD or deployment configuration

## Build Priority Order

Build and implement fully in this exact order. After each item, show what was built and confirm before proceeding:

1. PostgreSQL + Redis + backend + frontend services
2. .env.example — all env vars with inline descriptions
3. config.py — pydantic-settings Settings class loading all env vars
4. database.py — async SQLAlchemy engine, session factory, Base
5. models/price.py — PriceRecord ORM model + Pydantic schema
6. models/alert.py — AlertRecord ORM model + Pydantic schema
7. models/advisory.py — Advisory ORM model + Pydantic schema
8. cache.py — Redis async client with get/set/delete helpers
9. scrapers/tinyfish_client.py — TinyFish async wrapper with all four methods
10. scrapers/weather.py — BMKG + Open-Meteo integration for 5 province coordinates
11. agents/signal_detector.py — price_anomaly(), compound_signal(), SignalCategory enum
12. agents/tools.py — get_prices, get_weather, get_alerts, search_news tool definitions
13. agents/advisory_generator.py — generate_advisory() + translate_advisory()
14. agents/orchestrator.py — full OpenAI Agents SDK loop with Runner.run()
15. scheduler.py — APScheduler registering the agent run jobs
16. scrapers/pihps_prices.py — PIHPS price scraper
17. scrapers/bps_prices.py — BPS price scraper
18. scrapers/bbpopt_alerts.py — BBPOPT pest alert scraper
19. scrapers/ippc_alerts.py — IPPC pest report scraper
20. scrapers/news_search.py — Antara News + Kementan causal news search
21. main.py — all FastAPI routes + WebSocket /ws/advisories + lifespan startup
22. scripts/seed_demo_data.py — seed Jawa Barat rice + weather + BPH alert data
23. frontend/components/StatusBar.tsx
24. frontend/components/AdvisoryCard.tsx
25. frontend/components/ChatFeed.tsx
26. frontend/pages/index.tsx — assemble full chat UI
27. README.md — setup steps, how to seed data, how to run, demo script

Start by creating the full directory and file structure with all files as stubs (correct imports, empty function bodies with docstrings, placeholder comments). Then implement fully in the priority order above. Confirm after each numbered item before proceeding to the next.
