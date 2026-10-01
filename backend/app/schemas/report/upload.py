from datetime import date

from pydantic import BaseModel


class ReportUploadMeta(BaseModel):
    title: str
    category: str = "lab_report"  # lab_report | prescription
    hospital_name: str | None = None
    doctor_name: str | None = None
    report_date: date | None = None
    family_member_id: int | None = None

