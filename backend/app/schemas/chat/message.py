from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ChatAskRequest(BaseModel):
    session_id: int | None = None
    report_id: int | None = None
    question: str


class ChatMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    role: str
    content: str
    created_at: datetime


class ChatSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    report_id: int | None
    messages: list[ChatMessageOut] = []


class ChatAskResponse(BaseModel):
    session_id: int
    answer: str
