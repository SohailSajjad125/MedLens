from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin


class Report(Base, TimestampMixin):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    family_member_id: Mapped[int | None] = mapped_column(
        ForeignKey("family_members.id", ondelete="CASCADE"), nullable=True
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="lab_report")  # lab_report | prescription
    report_type: Mapped[str | None] = mapped_column(String(100), nullable=True)  # e.g. "CBC", "LFT"
    hospital_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    doctor_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    report_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str] = mapped_column(String(20), nullable=False)  # pdf | jpg | png

    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    is_processed: Mapped[bool] = mapped_column(Boolean, default=False)

    prescription_info: Mapped[str | None] = mapped_column(String(4000), nullable=True)
    translated_summary: Mapped[str | None] = mapped_column(String(4000), nullable=True)

    user = relationship("User", back_populates="reports")
    family_member = relationship("FamilyMember", back_populates="reports")
    ocr_result = relationship(
        "OCRResult", back_populates="report", uselist=False, cascade="all, delete-orphan"
    )
    ai_summary = relationship(
        "AISummary", back_populates="report", uselist=False, cascade="all, delete-orphan"
    )
    values = relationship("ReportValue", back_populates="report", cascade="all, delete-orphan")
    shares = relationship("ReportShare", back_populates="report", cascade="all, delete-orphan")

