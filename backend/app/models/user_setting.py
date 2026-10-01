from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin


class UserSetting(Base, TimestampMixin):
    __tablename__ = "user_settings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )

    theme: Mapped[str] = mapped_column(String(10), default="dark")  # dark | light
    language: Mapped[str] = mapped_column(String(10), default="en")  # en | ur
    email_notifications: Mapped[bool] = mapped_column(Boolean, default=True)

    user = relationship("User", back_populates="settings")
