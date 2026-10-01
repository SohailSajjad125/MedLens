from fastapi import HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.schemas.auth.login import LoginRequest
from app.schemas.auth.register import RegisterRequest
from app.schemas.auth.token import AuthResponse
from app.services.auth.auth_service import AuthService


class GoogleAuthRequest(BaseModel):
    email: EmailStr
    full_name: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str = Field(min_length=8, max_length=100)


class AuthController:
    def register(self, request: RegisterRequest, db: Session) -> AuthResponse:
        service = AuthService(db)
        try:
            service.register(request)
            return AuthResponse(success=True, message="Registration successful. You can now log in.")
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        except RuntimeError as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    def login(self, request: LoginRequest, db: Session) -> AuthResponse:
        service = AuthService(db)
        try:
            token = service.login(request)
            return AuthResponse(
                success=True, message="Login successful.", access_token=token, token_type="Bearer"
            )
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

    def google_auth(self, request: GoogleAuthRequest, db: Session) -> AuthResponse:
        service = AuthService(db)
        try:
            token = service.google_auth(request.email, request.full_name)
            return AuthResponse(
                success=True, message="Google Sign-In successful.", access_token=token, token_type="Bearer"
            )
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    def forgot_password(self, request: ForgotPasswordRequest, db: Session):
        service = AuthService(db)
        token = service.request_password_reset(request.email)
        return {
            "success": True,
            "message": "Password reset instructions have been sent to your email.",
            "reset_token": token,
        }

    def reset_password(self, request: ResetPasswordRequest, db: Session):
        service = AuthService(db)
        try:
            service.reset_password(request.email, request.new_password)
            return {"success": True, "message": "Password updated successfully. You can now log in."}
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


auth_controller = AuthController()
