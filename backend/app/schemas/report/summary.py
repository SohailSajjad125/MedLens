from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class ReportValueOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    test_name: str
    value: float | None
    unit: str | None
    reference_range: str | None
    is_abnormal: bool


class AISummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    summary_text: str
    simplified_explanation: str | None
    suggested_questions: str | None
    severity_level: str | None


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    category: str
    report_type: str | None
    hospital_name: str | None
    doctor_name: str | None
    report_date: date | None
    file_path: str
    file_type: str
    is_favorite: bool
    is_processed: bool
    created_at: datetime


class ReportDetailOut(ReportOut):
    extracted_text: str | None = None
    ai_summary: AISummaryOut | None = None
    values: list[ReportValueOut] = []
    prescription_info: str | None = None
    translated_summary: str | None = None

