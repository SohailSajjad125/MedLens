import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, distinct
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_roles, get_current_user
from app.models.report import Report
from app.models.report_share import ReportShare
from app.models.user import User
from app.models.notification import Notification
from app.schemas.report.summary import ReportOut
from app.services.audit_service import audit_service
from app.services.notification.email_service import email_service

router = APIRouter(prefix="/api/doctor", tags=["Doctor"])


class NotesRequest(BaseModel):
    notes: str


@router.get("/shared-reports", response_model=list[ReportOut])
def shared_reports(
    current_doctor: User = Depends(require_roles("doctor")),
    db: Session = Depends(get_db),
):
    """Reports explicitly shared with this doctor."""
    stmt = (
        select(Report)
        .join(ReportShare)
        .where(ReportShare.shared_with_doctor_id == current_doctor.id, ReportShare.is_active.is_(True))
    )
    return list(db.scalars(stmt))


@router.get("/patients")
def list_patients(
    current_doctor: User = Depends(require_roles("doctor")),
    db: Session = Depends(get_db),
):
    """List patients who have shared reports with the doctor."""
    stmt = (
        select(User)
        .distinct()
        .join(Report, Report.user_id == User.id)
        .join(ReportShare, ReportShare.report_id == Report.id)
        .where(ReportShare.shared_with_doctor_id == current_doctor.id, ReportShare.is_active.is_(True))
    )
    patients = db.scalars(stmt).all()
    return [
        {
            "id": p.id,
            "full_name": p.full_name,
            "email": p.email,
            "joined_at": p.created_at,
        }
        for p in patients
    ]


@router.get("/patient/{patient_id}")
def patient_profile(
    patient_id: int,
    current_doctor: User = Depends(require_roles("doctor")),
    db: Session = Depends(get_db),
):
    """Retrieve details, health profile, and shared reports of a patient."""
    # Verify the patient has shared at least one report with the doctor
    share_check = db.scalar(
        select(ReportShare)
        .join(Report)
        .where(
            Report.user_id == patient_id,
            ReportShare.shared_with_doctor_id == current_doctor.id,
            ReportShare.is_active.is_(True)
        )
    )
    if not share_check:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Access to patient records is not authorized.")

    patient = db.get(User, patient_id)
    if not patient:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found.")

    profile = patient.health_profile
    profile_data = {
        "date_of_birth": profile.date_of_birth if profile else None,
        "gender": profile.gender if profile else None,
        "blood_group": profile.blood_group if profile else None,
        "height_cm": profile.height_cm if profile else None,
        "weight_kg": profile.weight_kg if profile else None,
        "allergies": profile.allergies if profile else None,
        "medical_conditions": profile.medical_conditions if profile else None,
        "bmi": profile.bmi if profile else None,
    }

    # Fetch shared reports
    stmt = (
        select(Report)
        .join(ReportShare)
        .where(
            Report.user_id == patient_id,
            ReportShare.shared_with_doctor_id == current_doctor.id,
            ReportShare.is_active.is_(True)
        )
    )
    reports = db.scalars(stmt).all()

    return {
        "patient": {
            "id": patient.id,
            "full_name": patient.full_name,
            "email": patient.email,
        },
        "health_profile": profile_data,
        "shared_reports": [ReportOut.model_validate(r) for r in reports],
    }


@router.get("/shares")
def list_active_shares(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List doctor shares created by this user/patient."""
    stmt = (
        select(ReportShare)
        .join(Report)
        .where(Report.user_id == current_user.id, ReportShare.is_active.is_(True))
    )
    shares = db.scalars(stmt).all()
    return [
        {
            "id": s.id,
            "report_id": s.report_id,
            "report_title": s.report.title,
            "doctor_name": s.doctor.full_name if s.doctor else "Unknown Doctor",
            "doctor_email": s.doctor.email if s.doctor else "N/A",
            "share_token": s.share_token,
            "created_at": s.created_at,
        }
        for s in shares
    ]


@router.post("/share/{report_id}")
def share_report(
    report_id: int,
    doctor_email: str,
    current_user: User = Depends(require_roles("patient", "doctor")),
    db: Session = Depends(get_db),
):
    """Patient shares one of their own reports with a doctor by email."""
    report = db.get(Report, report_id)
    if report is None or report.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report not found.")

    doctor = db.scalar(select(User).where(User.email == doctor_email))
    if doctor is None or not doctor.role or doctor.role.name != "doctor":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No doctor account found with that email.")

    # Prevent duplicate active shares
    existing = db.scalar(
        select(ReportShare).where(
            ReportShare.report_id == report.id,
            ReportShare.shared_with_doctor_id == doctor.id,
            ReportShare.is_active.is_(True)
        )
    )
    if existing:
        return {"success": True, "message": f"Report is already shared with Dr. {doctor.full_name}."}

    share = ReportShare(
        report_id=report.id,
        shared_with_doctor_id=doctor.id,
        share_token=secrets.token_urlsafe(24),
    )
    db.add(share)

    # Notify doctor (in-app)
    db.add(
        Notification(
            user_id=doctor.id,
            title="New Shared Report",
            message=f"Patient {current_user.full_name} shared the report '{report.title}' with you.",
            notif_type="report_shared",
        )
    )
    db.commit()

    # Audit log
    audit_service.log_action(
        db,
        current_user.id,
        "SHARE_REPORT",
        f"Shared report '{report.title}' with Dr. {doctor.full_name} ({doctor_email})",
    )

    # Email notification to doctor (if doctor has email notifications enabled)
    if doctor.settings and doctor.settings.email_notifications:
        subject = f"MedLens AI: A patient has shared a report with you"
        body = f"""
        <p>Hello Dr. {doctor.full_name},</p>
        <p>Patient <strong>{current_user.full_name}</strong> has shared the medical report
        <strong>'{report.title}'</strong> with you on MedLens AI.</p>
        <p>Log in to your doctor dashboard to review it.</p>
        <br>
        <p>Best regards,<br>MedLens AI Team</p>
        """
        email_service.send_email_background(doctor.email, subject, body)

    return {"success": True, "message": f"Report shared with Dr. {doctor.full_name}."}


@router.delete("/share/{share_id}")
def revoke_share(
    share_id: int,
    current_user: User = Depends(require_roles("patient")),
    db: Session = Depends(get_db),
):
    share = db.get(ReportShare, share_id)
    if share is None or share.report.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Share not found.")

    doctor_name = share.doctor.full_name if share.doctor else "Unknown Doctor"
    report_title = share.report.title if share.report else "Unknown Report"

    share.is_active = False
    db.commit()

    # Audit log
    audit_service.log_action(
        db,
        current_user.id,
        "REVOKE_SHARE",
        f"Revoked access of Dr. {doctor_name} to report '{report_title}'",
    )

    return {"success": True, "message": "Access revoked."}


@router.get("/report/{report_id}/notes")
def get_doctor_notes(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve notes for a shared report."""
    stmt = select(ReportShare).where(
        ReportShare.report_id == report_id,
        ReportShare.is_active.is_(True)
    )
    # Check if user is either the doctor or the patient owning the report
    shares = db.scalars(stmt).all()
    authorized_share = None
    for s in shares:
        if s.shared_with_doctor_id == current_user.id or s.report.user_id == current_user.id:
            authorized_share = s
            break

    if not authorized_share:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Unauthorized to access notes for this report.")

    return {"notes": authorized_share.doctor_notes or ""}


@router.post("/report/{report_id}/notes")
def add_doctor_notes(
    report_id: int,
    req: NotesRequest,
    current_doctor: User = Depends(require_roles("doctor")),
    db: Session = Depends(get_db),
):
    """Add or update doctor notes on a shared report."""
    share = db.scalar(
        select(ReportShare).where(
            ReportShare.report_id == report_id,
            ReportShare.shared_with_doctor_id == current_doctor.id,
            ReportShare.is_active.is_(True)
        )
    )
    if not share:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Shared report not found.")

    share.doctor_notes = req.notes
    report_title = share.report.title if share.report else "Unknown Report"

    # Notify patient (in-app)
    db.add(
        Notification(
            user_id=share.report.user_id,
            title="Doctor Reviewed Your Report",
            message=f"Dr. {current_doctor.full_name} added notes to your report '{report_title}'.",
            notif_type="doctor_review",
        )
    )
    db.commit()

    # Audit log
    audit_service.log_action(
        db,
        current_doctor.id,
        "ADD_DOCTOR_NOTES",
        f"Added notes to report '{report_title}' (report_id={report_id})",
    )

    # Email notification to patient (if patient has email notifications enabled)
    patient = db.get(User, share.report.user_id)
    if patient and patient.settings and patient.settings.email_notifications:
        subject = f"MedLens AI: Dr. {current_doctor.full_name} reviewed your report"
        body = f"""
        <p>Hello {patient.full_name},</p>
        <p>Dr. <strong>{current_doctor.full_name}</strong> has added review notes to your report
        <strong>'{report_title}'</strong> on MedLens AI.</p>
        <p>Log in to your dashboard to read the doctor's notes.</p>
        <br>
        <p>Best regards,<br>MedLens AI Team</p>
        """
        email_service.send_email_background(patient.email, subject, body)

    return {"success": True, "message": "Notes saved."}


@router.get("/list-doctors")
def list_all_doctors(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all registered doctor accounts — used by patients for the share modal."""
    doctor_role_subq = select(User).join(User.role).where(User.role.has(name="doctor"))
    doctors = db.scalars(doctor_role_subq).all()
    return [
        {
            "id": d.id,
            "full_name": d.full_name,
            "email": d.email,
        }
        for d in doctors
    ]


@router.post("/share-all/{doctor_id}")
def share_all_reports(
    doctor_id: int,
    current_user: User = Depends(require_roles("patient")),
    db: Session = Depends(get_db),
):
    """Share ALL of a patient's reports with a specific doctor at once."""
    doctor = db.get(User, doctor_id)
    if doctor is None or not doctor.role or doctor.role.name != "doctor":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Doctor account not found.")

    # Get all patient reports
    reports = db.scalars(select(Report).where(Report.user_id == current_user.id)).all()
    if not reports:
        return {"success": True, "message": "No reports to share.", "shared_count": 0}

    shared_count = 0
    already_shared = 0

    for report in reports:
        existing = db.scalar(
            select(ReportShare).where(
                ReportShare.report_id == report.id,
                ReportShare.shared_with_doctor_id == doctor_id,
                ReportShare.is_active.is_(True)
            )
        )
        if existing:
            already_shared += 1
            continue

        share = ReportShare(
            report_id=report.id,
            shared_with_doctor_id=doctor_id,
            share_token=secrets.token_urlsafe(24),
        )
        db.add(share)
        shared_count += 1

    if shared_count > 0:
        # Single notification for all shared reports
        db.add(
            Notification(
                user_id=doctor_id,
                title="New Shared Reports",
                message=f"Patient {current_user.full_name} shared {shared_count} report(s) with you.",
                notif_type="report_shared",
            )
        )
        db.commit()

        audit_service.log_action(
            db,
            current_user.id,
            "SHARE_REPORT",
            f"Shared all {shared_count} report(s) with Dr. {doctor.full_name}",
        )

        # Email notification
        if doctor.settings and doctor.settings.email_notifications:
            subject = "MedLens AI: A patient has shared their reports with you"
            body = f"""
            <p>Hello Dr. {doctor.full_name},</p>
            <p>Patient <strong>{current_user.full_name}</strong> has shared <strong>{shared_count} report(s)</strong> with you on MedLens AI.</p>
            <p>Log in to your doctor dashboard to review them.</p>
            <br>
            <p>Best regards,<br>MedLens AI Team</p>
            """
            email_service.send_email_background(doctor.email, subject, body)

    total = shared_count + already_shared
    msg = f"Done. {shared_count} report(s) newly shared"
    if already_shared:
        msg += f", {already_shared} were already shared."
    else:
        msg += "."
    return {"success": True, "message": msg, "shared_count": shared_count, "already_shared": already_shared}
