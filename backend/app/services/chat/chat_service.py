from sqlalchemy.orm import Session

from app.models.chat_message import ChatMessage
from app.models.chat_session import ChatSession
from app.models.report import Report
from app.repositories.chat.chat_repository import ChatRepository
from app.schemas.chat.message import ChatAskRequest
from app.services.ai.groq_service import groq_service


class ChatService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ChatRepository(db)

    def list_sessions(self, user_id: int) -> list[ChatSession]:
        return self.repo.list_sessions_for_user(user_id)

    def ask(self, user_id: int, data: ChatAskRequest) -> tuple[int, str]:
        session = None
        if data.session_id:
            session = self.repo.get_session(data.session_id)
            if session is None or session.user_id != user_id:
                raise ValueError("Chat session not found.")
        else:
            session = self.repo.create_session(
                ChatSession(
                    user_id=user_id,
                    report_id=data.report_id,
                    title=data.question[:60],
                )
            )

        self.repo.add_message(ChatMessage(session_id=session.id, role="user", content=data.question))

        report_context = None
        report_id = data.report_id or session.report_id
        if report_id:
            report: Report | None = self.db.get(Report, report_id)
            if report and report.user_id == user_id and report.ocr_result:
                report_context = report.ocr_result.raw_text

        history = [{"role": m.role, "content": m.content} for m in session.messages]
        answer = groq_service.answer_question(data.question, report_context, history)

        self.repo.add_message(ChatMessage(session_id=session.id, role="assistant", content=answer))

        return session.id, answer
