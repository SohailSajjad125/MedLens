import logging
import smtplib
import threading
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    @staticmethod
    def _send_email_sync(to_email: str, subject: str, body: str) -> None:
        if not settings.SMTP_HOST or not settings.SMTP_USER:
            logger.info(
                "\n=================== [EMAIL SANDBOX] ===================\n"
                "To: %s\n"
                "Subject: %s\n"
                "Body:\n%s\n"
                "=======================================================",
                to_email,
                subject,
                body,
            )
            return

        try:
            msg = MIMEText(body, "html")
            msg["Subject"] = subject
            msg["From"] = settings.SMTP_FROM_EMAIL
            msg["To"] = to_email

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                if settings.SMTP_PORT == 587:
                    server.starttls()
                if settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
            logger.info("Email sent successfully to %s: %s", to_email, subject)
        except Exception:
            logger.exception("Failed to send email to %s", to_email)

    def send_email_background(self, to_email: str, subject: str, body: str) -> None:
        """Sends an email in a background thread to prevent blocking requests."""
        thread = threading.Thread(target=self._send_email_sync, args=(to_email, subject, body))
        thread.daemon = True
        thread.start()


email_service = EmailService()
