from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Role(Base):
    """
    admin | doctor | patient
    Looked up by name, never assumed to be a fixed ID.
    """

    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)

    users = relationship("User", back_populates="role")

    def __repr__(self) -> str:
        return f"<Role {self.name}>"
