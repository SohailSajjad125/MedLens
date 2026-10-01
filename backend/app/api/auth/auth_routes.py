from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.auth.auth_controller import (
    auth_controller,
    ForgotPasswordRequest,
    GoogleAuthRequest,
    ResetPasswordRequest,
)
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.auth.login import LoginRequest
from app.schemas.auth.register import RegisterRequest
from app.schemas.auth.token import AuthResponse
from app.schemas.auth.user import UserOut

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=AuthResponse)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    return auth_controller.register(request, db)


@router.post("/login", response_model=AuthResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    return auth_controller.login(request, db)


@router.post("/google", response_model=AuthResponse)
def google_login(request: GoogleAuthRequest, db: Session = Depends(get_db)):
    return auth_controller.google_auth(request, db)


@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    return auth_controller.forgot_password(request, db)


@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    return auth_controller.reset_password(request, db)


@router.get("/me", response_model=UserOut)
def me(current_user=Depends(get_current_user)):
    return UserOut.from_user(current_user)
