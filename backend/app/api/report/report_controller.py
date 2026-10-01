import json

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.report.compare import CompareResponse
from app.schemas.report.summary import AISummaryOut, ReportDetailOut, ReportOut, ReportValueOut
from app.schemas.report.upload import ReportUploadMeta
from app.services.report.report_service import ReportService


class ReportController:
    def upload(self, current_user: User, meta: ReportUploadMeta, file: UploadFile, db: Session):
        service = ReportService(db)
        try:
            report = service.upload_and_process(current_user.id, meta, file)
            return ReportOut.model_validate(report)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    def list_reports(self, current_user: User, db: Session):
        service = ReportService(db)
        reports = service.list_for_user(current_user.id)
        return [ReportOut.model_validate(r) for r in reports]

    def get_detail(self, current_user: User, report_id: int, db: Session):
        service = ReportService(db)
        try:
            report = service.get_detail(current_user.id, report_id)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

        detail = ReportDetailOut.model_validate(report)
        detail.extracted_text = report.ocr_result.raw_text if report.ocr_result else None
        detail.ai_summary = AISummaryOut.model_validate(report.ai_summary) if report.ai_summary else None
        detail.values = [ReportValueOut.model_validate(v) for v in report.values]
        return detail

    def delete(self, current_user: User, report_id: int, db: Session):
        service = ReportService(db)
        try:
            service.delete(current_user.id, report_id)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        return {"success": True, "message": "Report deleted."}

    def toggle_favorite(self, current_user: User, report_id: int, db: Session):
        service = ReportService(db)
        try:
            report = service.toggle_favorite(current_user.id, report_id)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        return ReportOut.model_validate(report)

    def compare(self, current_user: User, report_a_id: int, report_b_id: int, db: Session):
        service = ReportService(db)
        try:
            result = service.compare(current_user.id, report_a_id, report_b_id)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        return CompareResponse(**result)

    def trends(self, current_user: User, db: Session):
        service = ReportService(db)
        return service.get_trends(current_user.id)

    def timeline(self, current_user: User, db: Session):
        service = ReportService(db)
        return service.get_timeline(current_user.id)

    def translate(self, current_user: User, report_id: int, db: Session):
        service = ReportService(db)
        try:
            return service.translate_report(current_user.id, report_id)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


report_controller = ReportController()
