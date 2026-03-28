import asyncio, sys, httpx
sys.path.insert(0, 'backend')
from dotenv import load_dotenv; load_dotenv('.env')
from bs4 import BeautifulSoup

URL = "https://www.kemendag.go.id/id/harga-pangan"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

async def debug():
    async with httpx.AsyncClient(timeout=15.0, headers=HEADERS, follow_redirects=True) as client:
        r = await client.get(URL)
        print('Status:', r.status_code, '| Final URL:', r.url)
        print('Content length:', len(r.text))
        soup = BeautifulSoup(r.text, 'html.parser')

        # Check for tables
        tables = soup.find_all('table')
        print(f'Tables found: {len(tables)}')
        for i, t in enumerate(tables[:3]):
            rows = t.find_all('tr')
            print(f'  Table {i}: {len(rows)} rows')
            for row in rows[:3]:
                cells = [td.get_text(strip=True)[:30] for td in row.find_all(['td','th'])]
                if cells:
                    print(f'    {cells}')

        # Check for price-related text
        text = soup.get_text()
        price_keywords = ['beras', 'cabai', 'harga', 'kg', 'IDR', 'Rp']
        found = [kw for kw in price_keywords if kw.lower() in text.lower()]
        print(f'Price keywords found: {found}')
        print('First 500 chars of body text:', text[:500])

asyncio.run(debug())
