from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin


class AISummary(Base, TimestampMixin):
    __tablename__ = "ai_summaries"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    report_id: Mapped[int] = mapped_column(
        ForeignKey("reports.id", ondelete="CASCADE"), unique=True, nullable=False
    )

    summary_text: Mapped[str] = mapped_column(Text, nullable=False)
    simplified_explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    suggested_questions: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON list
    severity_level: Mapped[str | None] = mapped_column(String(20), nullable=True)  # normal|watch|urgent

    report = relationship("Report", back_populates="ai_summary")
