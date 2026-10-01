import secrets
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.doctor_profile import DoctorProfile
from app.models.user import User
from app.models.user_setting import UserSetting
from app.repositories.auth.role_repository import RoleRepository
from app.repositories.auth.user_repository import UserRepository
from app.schemas.auth.login import LoginRequest
from app.schemas.auth.register import RegisterRequest
from app.services.audit_service import audit_service


class AuthService:
    """Handles authentication business logic including RBAC, OAuth, & password reset."""

    def __init__(self, db: Session):
        self.db = db
        self.users = UserRepository(db)
        self.roles = RoleRepository(db)

    def register(self, data: RegisterRequest) -> User:
        if self.users.get_by_email(data.email):
            raise ValueError("An account with this email already exists.")

        target_role_name = "doctor" if data.role == "doctor" else "patient"
        role = self.roles.get_by_name(target_role_name)
        if role is None:
            raise RuntimeError(f"The '{target_role_name}' role is missing in the database.")

        user = User(
            role_id=role.id,
            full_name=data.full_name,
            email=data.email,
            password_hash=hash_password(data.password),
        )
        user = self.users.create(user)

        if target_role_name == "doctor":
            doctor_profile = DoctorProfile(
                user_id=user.id,
                license_number=data.license_number or "PENDING-LICENSE",
                specialization=data.specialization or "General Medicine",
                hospital=data.hospital or "General Hospital",
                experience_years=data.experience_years or 1,
            )
            self.db.add(doctor_profile)

        # Every new user gets a default settings row (dark theme, English).
        self.db.add(UserSetting(user_id=user.id))
        self.db.commit()

        audit_service.log_action(self.db, user.id, "REGISTER", f"Registered as {target_role_name}")
        return user

    def login(self, data: LoginRequest) -> str:
        user = self.users.get_by_email(data.email)
        if user is None or user.password_hash is None:
            raise ValueError("Invalid email or password.")

        if not verify_password(data.password, user.password_hash):
            raise ValueError("Invalid email or password.")

        if not user.is_active:
            raise ValueError("This account has been deactivated.")

        user.last_login = datetime.now(timezone.utc)
        self.users.save(user)

        audit_service.log_action(self.db, user.id, "LOGIN", "Logged in with password")
        return create_access_token({"sub": str(user.id), "role": user.role.name})

    def google_auth(self, email: str, full_name: str) -> str:
        user = self.users.get_by_email(email)
        if user is None:
            patient_role = self.roles.get_by_name("patient")
            user = User(
                role_id=patient_role.id if patient_role else 1,
                full_name=full_name,
                email=email,
                password_hash=hash_password(secrets.token_urlsafe(16)),
            )
            user = self.users.create(user)
            self.db.add(UserSetting(user_id=user.id))
            self.db.commit()
            audit_service.log_action(self.db, user.id, "REGISTER", "Registered via Google OAuth")

        if not user.is_active:
            raise ValueError("This account has been deactivated.")

        user.last_login = datetime.now(timezone.utc)
        self.users.save(user)
        audit_service.log_action(self.db, user.id, "LOGIN", "Logged in via Google OAuth")
        return create_access_token({"sub": str(user.id), "role": user.role.name if user.role else "patient"})

    def request_password_reset(self, email: str) -> str:
        user = self.users.get_by_email(email)
        if user is None:
            # Silently return token representation so email enumeration is avoided
            return "reset_token_simulated"
        reset_token = secrets.token_urlsafe(32)
        audit_service.log_action(self.db, user.id, "PASSWORD_RESET_REQUESTED")
        return reset_token

    def reset_password(self, email: str, new_password: str) -> None:
        user = self.users.get_by_email(email)
        if user is None:
            raise ValueError("User not found.")
        user.password_hash = hash_password(new_password)
        self.users.save(user)
        audit_service.log_action(self.db, user.id, "PASSWORD_RESET_SUCCESS")
