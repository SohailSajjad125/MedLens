from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.report import Report
from app.models.report_value import ReportValue


class ReportRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, report: Report) -> Report:
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)
        return report

    def get_by_id(self, report_id: int) -> Report | None:
        return self.db.get(Report, report_id)

    def list_for_user(self, user_id: int) -> list[Report]:
        stmt = (
            select(Report)
            .where(Report.user_id == user_id)
            .order_by(Report.created_at.desc())
        )
        return list(self.db.scalars(stmt))

    def delete(self, report: Report) -> None:
        self.db.delete(report)
        self.db.commit()

    def save(self, report: Report) -> Report:
        self.db.commit()
        self.db.refresh(report)
        return report

    def add_values(self, values: list[ReportValue]) -> None:
        self.db.add_all(values)
        self.db.commit()

    def values_for_test(self, user_id: int, test_name: str) -> list[ReportValue]:
        stmt = (
            select(ReportValue)
            .join(Report)
            .where(Report.user_id == user_id, ReportValue.test_name == test_name)
            .order_by(Report.report_date.asc())
        )
        return list(self.db.scalars(stmt))
