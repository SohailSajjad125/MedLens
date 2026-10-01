import json
from datetime import date
from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.ai_summary import AISummary
from app.models.ocr_result import OCRResult
from app.models.report import Report
from app.models.report_value import ReportValue
from app.models.notification import Notification
from app.models.user import User
from app.models.report_share import ReportShare
from app.repositories.report.report_repository import ReportRepository
from app.schemas.report.upload import ReportUploadMeta
from app.services.ai.groq_service import groq_service
from app.services.report.ocr_service import ocr_service
from app.services.report.value_extractor import extract_values
from app.utils.file_storage import save_upload
from app.services.audit_service import audit_service
from app.services.notification.email_service import email_service



class ReportService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ReportRepository(db)

    def upload_and_process(self, user_id: int, meta: ReportUploadMeta, file: UploadFile) -> Report:
        file_path, file_type = save_upload(file)

        report = Report(
            user_id=user_id,
            family_member_id=meta.family_member_id,
            title=meta.title,
            category=meta.category,
            hospital_name=meta.hospital_name,
            doctor_name=meta.doctor_name,
            report_date=meta.report_date,
            file_path=file_path,
            file_type=file_type,
        )
        report = self.repo.create(report)

        # Synchronous pipeline for simplicity
        self._run_ai_pipeline(report)

        # Log audit action
        audit_service.log_action(self.db, user_id, "UPLOAD_REPORT", f"Uploaded report '{report.title}' ({report.category})")

        return report

    def _run_ai_pipeline(self, report: Report) -> None:
        raw_text = ocr_service.extract_text(report.file_path, report.file_type)

        if raw_text:
            self.db.add(OCRResult(report_id=report.id, raw_text=raw_text))

            if report.category == "prescription":
                # Process prescription via Gemini
                ai_data = groq_service.summarize_prescription(raw_text)
                report.prescription_info = json.dumps(ai_data)
                
                # Create corresponding AI summary row for backward compatibility
                self.db.add(
                    AISummary(
                        report_id=report.id,
                        summary_text=ai_data.get("summary_text", "Prescription analyzed successfully."),
                        simplified_explanation=ai_data.get("instructions", "Follow dosage instructions closely."),
                        suggested_questions=json.dumps(["How long should I take these medications?", "Are there side effects?"]),
                        severity_level="normal",
                    )
                )
            else:
                # Process standard lab report
                extracted_values = extract_values(raw_text)
                if extracted_values:
                    self.repo.add_values(
                        [ReportValue(report_id=report.id, **v) for v in extracted_values]
                    )

                ai_data = groq_service.summarize_report(raw_text)
                self.db.add(
                    AISummary(
                        report_id=report.id,
                        summary_text=ai_data.get("summary_text", ""),
                        simplified_explanation=ai_data.get("simplified_explanation"),
                        suggested_questions=ai_data.get("suggested_questions", "[]"),
                        severity_level=ai_data.get("severity_level", "normal"),
                    )
                )

            # Insert an in-app notification
            self.db.add(
                Notification(
                    user_id=report.user_id,
                    title="Report Processed Successfully",
                    message=f"AI analysis for '{report.title}' is ready.",
                    notif_type="report_ready",
                )
            )

            # Send Email notification in the background
            user = self.db.get(User, report.user_id)
            if user and user.settings and user.settings.email_notifications:
                subject = f"MedLens AI: '{report.title}' is ready"
                body = f"""
                <p>Hello {user.full_name},</p>
                <p>Your uploaded record <strong>{report.title}</strong> has been successfully analyzed by MedLens AI.</p>
                <p><strong>Summary:</strong></p>
                <p>{ai_data.get("summary_text", "Analysis complete.")}</p>
                <p>Log in to your dashboard to view the full report, structured values, and start a Q&A chat.</p>
                <br>
                <p>Best regards,<br>MedLens AI Team</p>
                """
                email_service.send_email_background(user.email, subject, body)

        report.is_processed = True
        self.db.commit()

    def list_for_user(self, user_id: int) -> list[Report]:
        return self.repo.list_for_user(user_id)

    def get_detail(self, user_id: int, report_id: int) -> Report:
        report = self.repo.get_by_id(report_id)
        if report is None:
            raise ValueError("Report not found.")
        
        if report.user_id == user_id:
            return report
            
        # Check active share for doctor
        active_share = self.db.scalar(
            select(ReportShare).where(
                ReportShare.report_id == report_id,
                ReportShare.shared_with_doctor_id == user_id,
                ReportShare.is_active.is_(True)
            )
        )
        if active_share:
            return report

        # Check if admin
        user = self.db.get(User, user_id)
        if user and user.role and user.role.name == "admin":
            return report

        raise ValueError("Report not found.")


    def delete(self, user_id: int, report_id: int) -> None:
        report = self.repo.get_by_id(report_id)
        if report is None:
            raise ValueError("Report not found.")
        user = self.db.get(User, user_id)
        if report.user_id == user_id or (user and user.role and user.role.name == "admin"):
            report_title = report.title
            self.repo.delete(report)
            audit_service.log_action(self.db, user_id, "DELETE_REPORT", f"Deleted report '{report_title}'")
            return
        raise ValueError("Report not found.")


    def toggle_favorite(self, user_id: int, report_id: int) -> Report:
        report = self.get_detail(user_id, report_id)
        report.is_favorite = not report.is_favorite
        return self.repo.save(report)

    def compare(self, user_id: int, report_a_id: int, report_b_id: int) -> dict:
        report_a = self.get_detail(user_id, report_a_id)
        report_b = self.get_detail(user_id, report_b_id)

        values_a = {v.test_name: v for v in report_a.values}
        values_b = {v.test_name: v for v in report_b.values}

        comparisons = []
        for name in set(values_a) | set(values_b):
            old = values_a.get(name)
            new = values_b.get(name)
            if old and new and old.value is not None and new.value is not None:
                if new.value == old.value:
                    trend = "unchanged"
                else:
                    trend = "improved" if new.value < old.value else "worsened"
            elif new and not old:
                trend = "new"
            else:
                trend = "unchanged"

            comparisons.append(
                {
                    "test_name": name,
                    "old_value": old.value if old else None,
                    "new_value": new.value if new else None,
                    "unit": (new or old).unit if (new or old) else None,
                    "trend": trend,
                }
            )

        return {
            "report_a_id": report_a_id,
            "report_b_id": report_b_id,
            "comparisons": comparisons,
        }

    def get_trends(self, user_id: int) -> dict:
        """Retrieve test trend datasets across all user's reports."""
        reports = self.repo.list_for_user(user_id)
        # Sort by date
        reports = sorted(reports, key=lambda r: r.report_date or r.created_at.date())

        categories = {
            "blood": ["hemoglobin", "wbc", "rbc", "platelets"],
            "liver": ["alt", "ast", "bilirubin", "alp"],
            "kidney": ["creatinine", "urea", "uric acid"],
            "cholesterol": ["cholesterol", "hdl", "ldl", "triglycerides"],
            "sugar": ["glucose", "hba1c"],
            "vitamins": ["vitamin d", "vitamin b12"],
        }

        canonical_map = {
            "hemoglobin": "hemoglobin",
            "hgb": "hemoglobin",
            "wbc": "wbc",
            "rbc": "rbc",
            "platelets": "platelets",
            "alt": "alt",
            "sgpt": "alt",
            "ast": "ast",
            "sgot": "ast",
            "bilirubin": "bilirubin",
            "alp": "alp",
            "creatinine": "creatinine",
            "urea": "urea",
            "uric acid": "uric acid",
            "cholesterol": "cholesterol",
            "hdl": "hdl",
            "ldl": "ldl",
            "triglycerides": "triglycerides",
            "glucose": "glucose",
            "fasting glucose": "glucose",
            "hba1c": "hba1c",
            "vitamin d": "vitamin d",
            "vit d": "vitamin d",
            "vitamin b12": "vitamin b12",
            "vit b12": "vitamin b12",
        }

        trends_data = {cat: [] for cat in categories}

        for r in reports:
            date_str = (r.report_date or r.created_at.date()).strftime("%Y-%m-%d")
            row_vals = {v.test_name.lower().strip(): v.value for v in r.values if v.value is not None}
            
            for cat, test_names in categories.items():
                data_point = {"date": date_str, "report_title": r.title}
                found = False
                for key, val in row_vals.items():
                    # Find matching canonical synonym
                    matched_canonical = None
                    for synonym, canonical in canonical_map.items():
                        if synonym in key:
                            matched_canonical = canonical
                            break
                    if matched_canonical and matched_canonical in test_names:
                        data_point[matched_canonical] = val
                        found = True
                if found:
                    trends_data[cat].append(data_point)

        return trends_data

    def get_timeline(self, user_id: int) -> list[dict]:
        """Compile a chronological medical event timeline."""
        reports = self.repo.list_for_user(user_id)
        events = []
        for r in reports:
            event_date = r.report_date or r.created_at.date()
            events.append({
                "id": r.id,
                "date": event_date.strftime("%Y-%m-%d"),
                "title": r.title,
                "type": r.category, # lab_report | prescription
                "doctor": r.doctor_name or "Unknown Doctor",
                "hospital": r.hospital_name or "Unknown Hospital/Lab",
                "severity": r.ai_summary.severity_level if r.ai_summary else "normal",
                "summary": r.ai_summary.summary_text if r.ai_summary else "No summary available."
            })
        return sorted(events, key=lambda e: e["date"], reverse=True)

    def translate_report(self, user_id: int, report_id: int) -> dict:
        """Translate AI summary into Urdu and store on Report."""
        report = self.get_detail(user_id, report_id)
        if not report.ai_summary:
            raise ValueError("No AI summary available to translate.")
        
        if report.translated_summary:
            return {"translated_summary": report.translated_summary}

        translated = groq_service.translate_to_urdu(report.ai_summary.summary_text)
        report.translated_summary = translated
        self.db.commit()

        # Log audit action
        audit_service.log_action(self.db, user_id, "TRANSLATE_REPORT", f"Translated report '{report.title}' to Urdu")

        return {"translated_summary": translated}
