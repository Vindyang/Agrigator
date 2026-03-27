from datetime import datetime
from enum import Enum
from typing import Optional

from sqlmodel import SQLModel, Field, Column
import sqlalchemy as sa


class AlertType(str, Enum):
    pest = "pest"
    disease = "disease"
    weather = "weather"


class Severity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class AlertRecord(SQLModel, table=True):
    __tablename__ = "alert_records"
    __table_args__ = (
        sa.Index("ix_alert_province_scraped", "province", "scraped_at"),
        sa.Index("ix_alert_type_severity", "alert_type", "severity"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    alert_type: AlertType
    province: str = Field(index=True)
    regency: Optional[str] = None               # kabupaten, nullable
    severity: Severity
    pest_name: Optional[str] = None             # "Wereng Batang Coklat"
    description: str
    source_url: str
    published_at: datetime = Field(sa_column=Column(sa.DateTime(timezone=True), nullable=False))
    scraped_at: datetime = Field(sa_column=Column(sa.DateTime(timezone=True), nullable=False))
