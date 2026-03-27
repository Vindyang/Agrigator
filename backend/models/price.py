from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from typing import Optional

from sqlmodel import SQLModel, Field, Column
import sqlalchemy as sa


class PriceLevel(str, Enum):
    wholesale = "wholesale"
    retail = "retail"


class PriceRecord(SQLModel, table=True):
    __tablename__ = "price_records"
    __table_args__ = (
        sa.Index("ix_price_province_commodity_date", "province", "commodity", "date_of_price"),
        sa.Index("ix_price_scraped_at", "scraped_at"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    commodity: str = Field(index=True)           # "beras", "cabai", "jagung"
    province: str = Field(index=True)            # "Jawa Barat"
    city: str
    price: Decimal = Field(sa_column=Column(sa.Numeric(10, 4), nullable=False))
    currency: str = Field(default="IDR", max_length=3)
    unit: str                                    # "per kg"
    price_level: PriceLevel
    source_url: str
    scraped_at: datetime = Field(sa_column=Column(sa.DateTime(timezone=True), nullable=False))
    date_of_price: date
