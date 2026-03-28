import asyncio, sys, httpx
sys.path.insert(0, 'backend')
from dotenv import load_dotenv; load_dotenv('.env')
from bs4 import BeautifulSoup
from scrapers.pertanian_news import _HEADERS, PERTANIAN_NEWS_URL

async def debug():
    async with httpx.AsyncClient(timeout=15.0, headers=_HEADERS, follow_redirects=True) as client:
        r = await client.get(PERTANIAN_NEWS_URL)

    soup = BeautifulSoup(r.text, 'html.parser')

    # Find first real article link and print its surrounding HTML (3 levels up)
    for a in soup.find_all('a', href=True):
        href = a['href']
        if 'show=news' in href and 'act=view' in href and 'id=' in href and a.get_text(strip=True):
            print('=== LINK TEXT ===')
            print(repr(a.get_text(strip=True)))
            print('=== PARENT HTML ===')
            print(a.parent)
            print('=== GRANDPARENT HTML ===')
            print(a.parent.parent if a.parent else 'none')
            print('=== GREAT-GRANDPARENT TEXT ===')
            gp = a.parent.parent.parent if a.parent and a.parent.parent else None
            if gp:
                print(gp.get_text(separator=' ', strip=True)[:400])
            break

asyncio.run(debug())
