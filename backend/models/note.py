from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field, Column
import sqlalchemy as sa


class FarmNote(SQLModel, table=True):
    __tablename__ = "farm_notes"

    id: Optional[int] = Field(default=None, primary_key=True)
    plot: str                                                       # e.g. "Turirejo 04"
    crop: str                                                       # e.g. "Shallot"
    tag: str                                                        # "Observation" | "Action" | "Reminder" | "Meeting"
    title: str
    body: str
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(sa.DateTime(timezone=True), nullable=False),
    )
