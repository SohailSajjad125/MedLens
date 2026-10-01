from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: str
    profile_image: str | None
    is_verified: bool
    role_name: str | None = None
    created_at: datetime

    @classmethod
    def from_user(cls, user):
        data = cls.model_validate(user)
        data.role_name = user.role.name if user.role else None
        return data
