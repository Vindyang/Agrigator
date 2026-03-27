from datetime import datetime
from enum import Enum
from typing import Optional, List

from sqlmodel import SQLModel, Field, Column, Relationship
import sqlalchemy as sa


class SignalCategory(str, Enum):
    urgent_action = "URGENT_ACTION"
    opportunity = "OPPORTUNITY"
    monitor = "MONITOR"
    hold = "HOLD"


# Join table: Advisory ↔ PriceRecord
class AdvisoryPriceLink(SQLModel, table=True):
    __tablename__ = "advisory_price_links"

    advisory_id: Optional[int] = Field(default=None, foreign_key="advisories.id", primary_key=True)
    price_record_id: Optional[int] = Field(default=None, foreign_key="price_records.id", primary_key=True)


# Join table: Advisory ↔ AlertRecord
class AdvisoryAlertLink(SQLModel, table=True):
    __tablename__ = "advisory_alert_links"

    advisory_id: Optional[int] = Field(default=None, foreign_key="advisories.id", primary_key=True)
    alert_record_id: Optional[int] = Field(default=None, foreign_key="alert_records.id", primary_key=True)


class Advisory(SQLModel, table=True):
    __tablename__ = "advisories"
    __table_args__ = (
        sa.Index("ix_advisory_province_created", "province", "created_at"),
        sa.Index("ix_advisory_signal_category", "signal_category"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    signal_category: SignalCategory
    commodity: str = Field(index=True)
    province: str = Field(index=True)
    advisory_text_en: str
    advisory_text_id: str                       # Bahasa Indonesia
    confidence: float                           # 0.0–1.0
    price_change_pct: Optional[float] = None
    expires_at: Optional[datetime] = Field(default=None, sa_column=Column(sa.DateTime(timezone=True)))
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(sa.DateTime(timezone=True), nullable=False),
    )
    feedback_helpful: Optional[int] = None      # NULL=no feedback | 1=helpful | 0=not helpful
    agent_trace: dict = Field(default_factory=dict, sa_column=Column(sa.JSON, nullable=False))
