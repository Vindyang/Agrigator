"""
Seed demo data so the first POST /agent/run fires URGENT_ACTION immediately.
Prices are hardcoded demo values — real data comes from SP2KP scraper at runtime.

Run: python -m scripts.seed_demo_data
"""
import asyncio
from datetime import datetime, timedelta, timezone, date
from decimal import Decimal

from sqlmodel import SQLModel
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.config import DATABASE_URL
from backend.models.price import PriceRecord, PriceLevel
from backend.models.alert import AlertRecord, AlertType, Severity

engine = create_async_engine(DATABASE_URL)
Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def seed() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    async with Session() as session:
        today = date.today()

        # 7 days of beras prices for Jawa Barat
        # Day -6 to -1: gradual rise (14,000 → 14,500 IDR/kg)
        # Day 0 (today): spike to 16,240 IDR/kg (+16% vs 7-day avg)
        base_prices = [14_000, 14_100, 14_150, 14_200, 14_300, 14_500, 16_240]
        for i, raw_price in enumerate(reversed(base_prices)):
            price_date = today - timedelta(days=i)
            session.add(PriceRecord(
                commodity="beras",
                province="Jawa Barat",
                city="Bandung",
                price=Decimal(str(raw_price)),
                currency="IDR",
                unit="per kg",
                price_level=PriceLevel.wholesale,
                source_url="https://sp2kp.kemendag.go.id/",
                scraped_at=datetime.now(timezone.utc),
                date_of_price=price_date,
            ))

        # Weather alert: heavy rainfall from BMKG
        session.add(AlertRecord(
            alert_type=AlertType.weather,
            province="Jawa Barat",
            regency=None,
            severity=Severity.high,
            pest_name=None,
            description="Peringatan dini curah hujan lebat: prakiraan 85mm/hari dalam 72 jam ke depan. Risiko banjir dan gagal panen di wilayah sentra padi.",
            source_url="https://www.bmkg.go.id/",
            published_at=datetime.now(timezone.utc) - timedelta(hours=2),
            scraped_at=datetime.now(timezone.utc),
        ))

        # Pest alert: sourced from the OPT reference PDF on Drive
        session.add(AlertRecord(
            alert_type=AlertType.pest,
            province="Jawa Barat",
            regency="Indramayu",
            severity=Severity.high,
            pest_name="Wereng Batang Coklat",
            description="Serangan WBC (Brown Planthopper) terdeteksi di Kabupaten Indramayu. Intensitas serangan tinggi pada varietas IR64. Waspada penyebaran ke kabupaten sekitarnya.",
            source_url="https://drive.google.com/file/d/166-T_jSBANfQhyNTzjJbFfe0A22JganS/view",
            published_at=datetime.now(timezone.utc) - timedelta(hours=6),
            scraped_at=datetime.now(timezone.utc),
        ))

        await session.commit()
        print("Seed data inserted:")
        print("  ✓ 7 × PriceRecord (beras, Jawa Barat) — IDR 14,000 → 16,240/kg (+16%)")
        print("  ✓ AlertRecord: heavy rainfall, Jawa Barat, severity=high  [BMKG]")
        print("  ✓ AlertRecord: Wereng Batang Coklat, Indramayu, severity=high  [Drive PDF]")
        print()
        print("→ Run: POST /agent/run {\"province\": \"Jawa Barat\", \"commodity\": \"beras\"}")
        print("→ Expected result: signal_category = URGENT_ACTION")


if __name__ == "__main__":
    asyncio.run(seed())
