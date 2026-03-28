import asyncio
import json
import logging
import httpx
import sys
import os
from dotenv import load_dotenv

load_dotenv()

TINYFISH_API_KEY = os.getenv("TINYFISH_API_KEY")
TINYFISH_API_URL = os.getenv("TINYFISH_API_URL", "https://agent.tinyfish.ai").rstrip("/")

BBPOPT_URL = "https://bbpopt.tanamanpangan.pertanian.go.id/banner/peramalan"

# Goal to navigate the page and extract the PDF
GOAL = """
Extract pest and disease forecast data from the BBPOPT portal.
1. The pest forecast data (Organisme Pengganggu Tumbuhan / OPT) is inside a PDF report linked on the page. Find the link to the newest OPT forecast PDF report, and CLICK IT.
2. IMPORTANT: If the PDF opens in Google Drive but says "File not found" or shows an error, GO BACK to the previous page and click the second newest report. Repeat until you find one that works.
3. Inside the successful PDF, locate the forecast tables. The tables have headings for the commodity (e.g. "PRAKIRAAN OPT PADI MT 2025-2026") and sub-headings indicating the specific pest (e.g. "PBP" for Penggerek Batang Padi).
4. The table columns are "No.", "Provinsi", "Minimum", "Rata-rata", and "Maksimum".
5. For each row in these tables, extract the data:
   - province: use the "Provinsi" column.
   - regency: return null.
   - commodity: use the commodity name from the section header (e.g., "Padi", "Jagung").
   - pest_name: use the abbreviation from the table header (e.g., "PBP", "WBC").
   - severity: evaluate the "Maksimum" number: if > 5000 output "sangat berat", if > 2500 output "berat", if > 500 output "sedang", else "ringan".

Return as JSON exactly matching this structure:
{"rows": [{"province": "Jawa Barat", "regency": null, "pest_name": "PBP", "severity": "sangat berat", "commodity": "Padi"}]}
"""

async def debug_bbpopt_live():
    print(f"\n🚀 Connecting to TinyFish at {TINYFISH_API_URL}")
    print(f"🔗 Target: {BBPOPT_URL}\n")

    headers = {
        "X-API-Key": TINYFISH_API_KEY,
        "Content-Type": "application/json",
        "Accept": "text/event-stream"
    }

    payload = {
        "url": BBPOPT_URL,
        "goal": GOAL,
        "browser_profile": "stealth"
    }

    async with httpx.AsyncClient(timeout=300.0) as client:
        print("⏳ Waiting for TinyFish Agent to start...\n" + "-"*50)
        
        async with client.stream(
            "POST",
            f"{TINYFISH_API_URL}/v1/automation/run-sse",
            json=payload,
            headers=headers
        ) as response:
            
            if response.status_code >= 400:
                body = await response.aread()
                print(f"❌ API Error {response.status_code}: {body.decode()}")
                return

            async for line in response.aiter_lines():
                if not line.startswith("data: "):
                    continue
                    
                try:
                    event = json.loads(line[6:])
                except json.JSONDecodeError:
                    continue

                event_type = event.get("type", "")

                if event_type == "STARTED":
                    print("✅ Job Started!")
                
                elif event_type == "STREAMING_URL":
                    stream_url = event.get("streaming_url", "")
                    print(f"\n📺 >>> WATCH THE AGENT LIVE IN YOUR BROWSER: {stream_url}")
                    print(f"⚠️  (Note: Make sure your browser sends your X-API-Key header using ModHeader extension, or it will say MISSING_API_KEY)\n")
                
                elif event_type == "PROGRESS":
                    purpose = event.get("purpose", "working...")
                    print(f"🤖 Agent is currently: {purpose}")
                
                elif event_type == "COMPLETE":
                    print("\n" + "="*50)
                    print("🎯 JOB COMPLETED!")
                    status = event.get("status", "FAILED")
                    if status == "COMPLETED":
                        print("Result JSON:", json.dumps(event.get("result", {}), indent=2))
                    else:
                        print("Failed with error:", event.get("error") or event.get("help_message"))
                    break

if __name__ == "__main__":
    asyncio.run(debug_bbpopt_live())
