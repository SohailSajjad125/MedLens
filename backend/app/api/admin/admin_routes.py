import os
import re
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.models.ai_summary import AISummary
from app.models.audit_log import AuditLog
from app.models.report import Report
from app.models.user import User
from app.models.role import Role
from app.models.feedback import Feedback
from app.schemas.auth.user import UserOut

router = APIRouter(prefix="/api/admin", tags=["Admin"])


class RoleUpdateRequest(BaseModel):
    role_name: str  # admin | doctor | patient


class FeedbackStatusRequest(BaseModel):
    status: str  # open | resolved | archived


@router.get("/stats")
def dashboard_stats(
    current_admin: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    total_users = db.scalar(select(func.count(User.id)))
    total_reports = db.scalar(select(func.count(Report.id)))
    total_ai_summaries = db.scalar(select(func.count(AISummary.id)))
    total_doctors = db.scalar(
        select(func.count(User.id)).join(User.role).where(User.role.has(name="doctor"))
    )

    return {
        "total_users": total_users or 0,
        "total_reports": total_reports or 0,
        "total_ai_summaries": total_ai_summaries or 0,
        "total_doctors": total_doctors or 0,
    }


@router.get("/users", response_model=list[UserOut])
def list_users(
    current_admin: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    users = list(db.scalars(select(User)))
    return [UserOut.from_user(u) for u in users]


@router.patch("/users/{user_id}/deactivate")
def deactivate_user(
    user_id: int,
    current_admin: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    user.is_active = False
    db.commit()
    return {"success": True, "message": f"{user.email} has been deactivated."}


@router.patch("/users/{user_id}/reactivate")
def reactivate_user(
    user_id: int,
    current_admin: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    user.is_active = True
    db.commit()
    return {"success": True, "message": f"{user.email} has been reactivated."}


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    req: RoleUpdateRequest,
    current_admin: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    
    role = db.scalar(select(Role).where(Role.name == req.role_name))
    if role is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Role not found.")

    user.role_id = role.id
    db.commit()
    return {"success": True, "message": f"User role updated to {req.role_name}."}


@router.get("/reports")
def list_all_reports(
    current_admin: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    reports = list(db.scalars(select(Report)))
    return [
        {
            "id": r.id,
            "title": r.title,
            "user_id": r.user_id,
            "category": r.category,
            "is_processed": r.is_processed,
            "created_at": r.created_at,
        }
        for r in reports
    ]


@router.get("/feedback")
def list_feedback(
    current_admin: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    stmt = select(Feedback).order_by(Feedback.created_at.desc())
    feedbacks = db.scalars(stmt).all()
    return [
        {
            "id": f.id,
            "user_email": f.user.email if f.user else "Anonymous",
            "subject": f.subject,
            "message": f.message,
            "status": f.status,
            "created_at": f.created_at,
        }
        for f in feedbacks
    ]


@router.patch("/feedback/{feedback_id}")
def update_feedback_status(
    feedback_id: int,
    req: FeedbackStatusRequest,
    current_admin: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    fb = db.get(Feedback, feedback_id)
    if fb is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Feedback not found.")
    fb.status = req.status
    db.commit()
    return {"success": True, "message": "Feedback status updated."}


@router.get("/audit-logs")
def get_audit_logs(
    current_admin: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    """Return the 100 most recent audit log entries."""
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(100)
    logs = db.scalars(stmt).all()
    return [
        {
            "id": log.id,
            "user_email": log.user.email if log.user else "System",
            "user_name": log.user.full_name if log.user else "System",
            "action": log.action,
            "details": log.details,
            "ip_address": log.ip_address,
            "created_at": log.created_at,
        }
        for log in logs
    ]


class ApiKeyRequest(BaseModel):
    api_key: str


@router.get("/api-key")
def get_api_key_status(
    current_admin: User = Depends(require_roles("admin")),
):
    """Return masked current API key status."""
    from app.core.config import settings
    key = settings.GROQ_API_KEY
    if not key:
        return {"configured": False, "masked_key": None, "model": settings.GROQ_MODEL}
    masked = key[:8] + "*" * (len(key) - 12) + key[-4:] if len(key) > 12 else "****"
    return {"configured": True, "masked_key": masked, "model": settings.GROQ_MODEL}


@router.post("/api-key")
def update_api_key(
    req: ApiKeyRequest,
    current_admin: User = Depends(require_roles("admin")),
):
    """Update the Groq API key at runtime and persist it to .env."""
    from app.core.config import settings, get_settings

    new_key = req.api_key.strip()
    if not new_key:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "API key cannot be empty.")

    # Update in-memory settings
    settings.GROQ_API_KEY = new_key

    # Persist to .env file
    env_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", ".env")
    env_path = os.path.abspath(env_path)
    try:
        if os.path.exists(env_path):
            content = open(env_path).read()
            if "GROQ_API_KEY=" in content:
                content = re.sub(r"GROQ_API_KEY=.*", f"GROQ_API_KEY={new_key}", content)
            else:
                content += f"\nGROQ_API_KEY={new_key}\n"
            with open(env_path, "w") as f:
                f.write(content)
    except Exception as e:
        # Key updated in memory even if file write fails
        return {"success": True, "message": f"API key updated in memory. Could not persist to .env: {e}"}

    return {"success": True, "message": "API key updated successfully and saved to .env."}
