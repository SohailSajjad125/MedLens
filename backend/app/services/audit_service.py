import logging
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog

logger = logging.getLogger(__name__)


class AuditService:
    @staticmethod
    def log_action(db: Session, user_id: int | None, action: str, details: str | None = None, ip_address: str | None = None) -> None:
        try:
            log = AuditLog(
                user_id=user_id,
                action=action,
                details=details,
                ip_address=ip_address,
            )
            db.add(log)
            db.commit()
        except Exception:
            logger.exception("Failed to write audit log action: %s", action)


audit_service = AuditService()
