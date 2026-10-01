from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.chat.message import ChatAskRequest, ChatAskResponse, ChatSessionOut
from app.services.chat.chat_service import ChatService

router = APIRouter(prefix="/api/chat", tags=["AI Chat Assistant"])


@router.get("/sessions", response_model=list[ChatSessionOut])
def list_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = ChatService(db)
    return service.list_sessions(current_user.id)


@router.post("/ask", response_model=ChatAskResponse)
def ask(
    request: ChatAskRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ChatService(db)
    try:
        session_id, answer = service.ask(current_user.id, request)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return ChatAskResponse(session_id=session_id, answer=answer)
