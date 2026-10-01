from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    full_name: str = Field(min_length=3, max_length=150)
    email: EmailStr
    password: str = Field(min_length=8, max_length=100)
    role: str = Field(default="patient")  # patient | doctor
    license_number: str | None = None
    specialization: str | None = None
    hospital: str | None = None
    experience_years: int | None = None

