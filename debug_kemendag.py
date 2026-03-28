import asyncio, sys, httpx
sys.path.insert(0, 'backend')
from dotenv import load_dotenv; load_dotenv('.env')

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://www.kemendag.go.id/",
}

# Common API patterns for Indonesian government price portals
CANDIDATES = [
    "https://www.kemendag.go.id/api/harga-pangan",
    "https://www.kemendag.go.id/api/commodity-price",
    "https://www.kemendag.go.id/api/v1/harga-pangan",
    "https://www.kemendag.go.id/api/v1/commodity-price",
    "https://www.kemendag.go.id/id/api/harga-pangan",
    "https://www.kemendag.go.id/en/commodity-price/json",
    "https://esi.kemendag.go.id/api/harga-pangan",
    "https://hargapangan.id/api/price",
    # PIHPS (hargapangan.id) — original price source from TODO
    "https://www.hargapangan.id/tabel-harga/pasar-tradisional/nasional",
    "https://panelharga.go.id/api/harga",
]

async def probe():
    async with httpx.AsyncClient(timeout=10.0, headers=HEADERS, follow_redirects=True) as client:
        for url in CANDIDATES:
            try:
                r = await client.get(url)
                print(f"{r.status_code} | {len(r.text):>7} chars | {url}")
                if r.status_code == 200 and len(r.text) > 100:
                    print(f"  >>> CONTENT: {r.text[:200]}")
            except Exception as e:
                print(f"ERR | {str(e)[:40]:>7} | {url}")

asyncio.run(probe())
