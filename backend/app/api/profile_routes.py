from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.family_member import FamilyMember
from app.models.health_profile import HealthProfile
from app.models.notification import Notification
from app.models.user import User
from app.models.user_setting import UserSetting
from app.models.feedback import Feedback


router = APIRouter(prefix="/api/profile", tags=["Health Profile & Settings"])


class HealthProfileIn(BaseModel):
    date_of_birth: str | None = None
    gender: str | None = None
    blood_group: str | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    allergies: str | None = None
    medical_conditions: str | None = None


class FamilyMemberIn(BaseModel):
    full_name: str
    relationship_label: str
    date_of_birth: str | None = None
    gender: str | None = None


class SettingsIn(BaseModel):
    theme: str | None = None
    language: str | None = None
    email_notifications: bool | None = None


@router.get("/health")
def get_health_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = current_user.health_profile
    if profile is None:
        return {}
    return {
        "date_of_birth": profile.date_of_birth,
        "gender": profile.gender,
        "blood_group": profile.blood_group,
        "height_cm": profile.height_cm,
        "weight_kg": profile.weight_kg,
        "allergies": profile.allergies,
        "medical_conditions": profile.medical_conditions,
        "bmi": profile.bmi,
    }


@router.put("/health")
def upsert_health_profile(
    data: HealthProfileIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = current_user.health_profile
    if profile is None:
        profile = HealthProfile(user_id=current_user.id)
        db.add(profile)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)

    db.commit()
    return {"success": True, "message": "Health profile updated."}


@router.get("/family")
def list_family(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return list(db.scalars(select(FamilyMember).where(FamilyMember.owner_id == current_user.id)))


@router.post("/family")
def add_family_member(
    data: FamilyMemberIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    member = FamilyMember(owner_id=current_user.id, **data.model_dump())
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.get("/settings")
def get_settings_(current_user: User = Depends(get_current_user)):
    s = current_user.settings
    if s is None:
        return {"theme": "dark", "language": "en", "email_notifications": True}
    return {"theme": s.theme, "language": s.language, "email_notifications": s.email_notifications}


@router.put("/settings")
def update_settings(
    data: SettingsIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = current_user.settings
    if s is None:
        s = UserSetting(user_id=current_user.id)
        db.add(s)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(s, field, value)

    db.commit()
    return {"success": True, "message": "Settings updated."}


@router.get("/notifications")
def list_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stmt = (
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
    )
    return list(db.scalars(stmt))


@router.patch("/notifications/{notification_id}/read")
def mark_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notif = db.get(Notification, notification_id)
    if notif is None or notif.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found.")
    notif.is_read = True
    db.commit()
    return {"success": True}


@router.delete("/notifications/{notification_id}")
def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notif = db.get(Notification, notification_id)
    if notif is None or notif.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found.")
    db.delete(notif)
    db.commit()
    return {"success": True}


class FeedbackIn(BaseModel):
    subject: str
    message: str


@router.post("/feedback")
def submit_feedback(
    data: FeedbackIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    fb = Feedback(user_id=current_user.id, subject=data.subject, message=data.message)
    db.add(fb)
    db.commit()
    return {"success": True, "message": "Feedback submitted. Thank you!"}

