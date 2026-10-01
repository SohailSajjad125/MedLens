from pydantic import BaseModel


class AuthResponse(BaseModel):
    success: bool
    message: str
    access_token: str | None = None
    token_type: str | None = None
