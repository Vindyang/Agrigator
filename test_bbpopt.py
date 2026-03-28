import asyncio
import sys
import os
import logging
from dotenv import load_dotenv

# Load the .env from the root directory
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# Ensure backend modules can be imported
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from backend.scrapers.bbpopt_alerts import scrape_bbpopt_alerts

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    print("🚀 Starting Web Scraper Testing...")
    print("Testing BBPOPT Pest & Disease Alerts scraper with TinyFish API...")
    
    try:
        # scrape_bbpopt_alerts takes no arguments
        records = await scrape_bbpopt_alerts()
        
        print(f"\n✅ Scraped {len(records)} records.")
        if not records:
            print("No alerts returned. Check if the page had data or if the API extraction failed.")
        
        for idx, r in enumerate(records):
            print(f"[{idx + 1}] Alert Type: {r.alert_type.name.upper()} | Severity: {r.severity.name.upper()}")
            print(f"    Pest: {r.pest_name}")
            print(f"    Region: {r.regency + ', ' if r.regency else ''}{r.province}")
            print(f"    Description: {r.description}")
            print(f"    Published: {r.published_at}")
            print("-" * 50)
            
    except Exception as e:
        logger.error(f"Error testing BBPOPT scraper: {e}")

if __name__ == "__main__":
    asyncio.run(main())
