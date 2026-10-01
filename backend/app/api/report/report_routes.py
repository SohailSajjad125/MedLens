from datetime import date

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.api.report.report_controller import report_controller
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.report.upload import ReportUploadMeta

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.post("/upload")
def upload_report(
    title: str = Form(...),
    category: str = Form("lab_report"),
    hospital_name: str | None = Form(None),
    doctor_name: str | None = Form(None),
    report_date: date | None = Form(None),
    family_member_id: int | None = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    meta = ReportUploadMeta(
        title=title,
        category=category,
        hospital_name=hospital_name,
        doctor_name=doctor_name,
        report_date=report_date,
        family_member_id=family_member_id,
    )
    return report_controller.upload(current_user, meta, file, db)


@router.get("")
def list_reports(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return report_controller.list_reports(current_user, db)


@router.get("/compare")
def compare_reports(
    report_a_id: int,
    report_b_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return report_controller.compare(current_user, report_a_id, report_b_id, db)


@router.get("/analytics/trends")
def get_trends(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return report_controller.trends(current_user, db)


@router.get("/timeline")
def get_timeline(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return report_controller.timeline(current_user, db)


@router.post("/{report_id}/translate")
def translate_report(
    report_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return report_controller.translate(current_user, report_id, db)


@router.get("/{report_id}")
def get_report(
    report_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return report_controller.get_detail(current_user, report_id, db)


@router.delete("/{report_id}")
def delete_report(
    report_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return report_controller.delete(current_user, report_id, db)


@router.patch("/{report_id}/favorite")
def toggle_favorite(
    report_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return report_controller.toggle_favorite(current_user, report_id, db)
