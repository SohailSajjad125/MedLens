from sqlalchemy import Boolean, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin


class ReportValue(Base, TimestampMixin):
    """
    One row per extracted lab value, e.g. ('Hemoglobin', 13.2, 'g/dL', 12-16, False).
    Powers trend charts and abnormal-value highlighting.
    """

    __tablename__ = "report_values"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    report_id: Mapped[int] = mapped_column(ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)

    test_name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    value: Mapped[float | None] = mapped_column(Float, nullable=True)
    unit: Mapped[str | None] = mapped_column(String(30), nullable=True)
    reference_range: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_abnormal: Mapped[bool] = mapped_column(Boolean, default=False)

    report = relationship("Report", back_populates="values")
