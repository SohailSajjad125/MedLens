import json
import logging

import google.generativeai as genai

from app.core.config import settings

logger = logging.getLogger(__name__)

_configured = False


def _ensure_configured() -> bool:
    global _configured
    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY is not set. AI features will return a placeholder.")
        return False
    if not _configured:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _configured = True
    return True


def _model():
    return genai.GenerativeModel(settings.GEMINI_MODEL)


class GeminiService:
    """
    Wrapper around the Gemini API used across the app for:
    - report summarization
    - prescription analysis
    - medical QA chat
    - translation to Urdu
    """

    def summarize_report(self, extracted_text: str) -> dict:
        if not _ensure_configured():
            return {
                "summary_text": "AI summary unavailable: set GEMINI_API_KEY in backend/.env.",
                "simplified_explanation": None,
                "suggested_questions": json.dumps([]),
                "severity_level": "normal",
            }

        prompt = f"""
You are a careful, plain-language medical assistant. A patient has uploaded a lab/medical
report. Using ONLY the extracted text below, respond with STRICT JSON (no markdown fences,
no extra commentary) with exactly these keys:

- "summary_text": a concise, professional 3-5 sentence summary of the report.
- "simplified_explanation": the same findings explained in very simple, reassuring language
  a non-medical person can understand.
- "abnormal_findings": an array of short strings naming any abnormal values found (empty
  array if none obviously abnormal from the text).
- "suggested_questions": an array of 3-5 short questions the patient could ask their doctor.
- "severity_level": one of "normal", "watch", "urgent" based on how concerning the findings
  appear. Use "urgent" only for clearly dangerous/critical values. This is not a diagnosis.

Extracted report text:
---
{extracted_text[:12000]}
---
"""
        try:
            response = _model().generate_content(prompt)
            data = self._safe_json(response.text)
            data["suggested_questions"] = json.dumps(data.get("suggested_questions", []))
            return data
        except Exception:
            logger.exception("Gemini summarize_report failed")
            return {
                "summary_text": "The AI summary could not be generated right now. Please try again.",
                "simplified_explanation": None,
                "suggested_questions": json.dumps([]),
                "severity_level": "normal",
            }

    def summarize_prescription(self, extracted_text: str) -> dict:
        if not _ensure_configured():
            return {
                "summary_text": "AI prescription analysis unavailable.",
                "medicines": [],
                "instructions": "N/A",
            }

        prompt = f"""
You are an expert pharmacist and medical assistant. A patient has uploaded a doctor's prescription.
Using the extracted text below, identify all medications, their dosages, frequencies, usage instructions,
and list common side effects or warnings. Respond with STRICT JSON (no markdown fences) with exactly these keys:

- "summary_text": A brief, comforting overview of the prescription.
- "medicines": An array of objects, where each object has:
    * "name": Name of the medicine/drug.
    * "dosage": E.g., "500mg", "1 tablet".
    * "frequency": E.g., "Twice daily", "Before meals".
    * "duration": E.g., "5 days", "Ongoing".
    * "side_effects": E.g., "May cause drowsiness", "Take with water".
- "instructions": General advice, doctor's notes, dietary warnings, or special precautions.

Extracted prescription text:
---
{extracted_text[:12000]}
---
"""
        try:
            response = _model().generate_content(prompt)
            return self._safe_json(response.text)
        except Exception:
            logger.exception("Gemini summarize_prescription failed")
            return {
                "summary_text": "Could not analyze the prescription details automatically.",
                "medicines": [],
                "instructions": "Please consult a healthcare professional for accurate guidance.",
            }

    def translate_to_urdu(self, text: str) -> str:
        if not _ensure_configured():
            return "ترجمہ دستیاب نہیں ہے۔"

        prompt = f"""
Translate the following medical explanation/summary text into clear, modern, and easily readable Urdu.
Ensure that while key English medical terms can remain in brackets if helpful, the explanation is simple, polite,
and natural-sounding Urdu.

Text to translate:
---
{text}
---
"""
        try:
            response = _model().generate_content(prompt)
            return response.text.strip()
        except Exception:
            logger.exception("Gemini translation failed")
            return "ترجمہ کرنے میں خرابی پیش آئی۔ دوبارہ کوشش کریں۔"

    def answer_question(self, question: str, report_context: str | None, history: list[dict]) -> str:
        if not _ensure_configured():
            return "AI chat is unavailable right now: the server is missing a GEMINI_API_KEY."

        context_block = (
            f"Relevant report/prescription content:\n---\n{report_context[:8000]}\n---\n"
            if report_context
            else "No specific report or prescription is attached to this conversation.\n"
        )

        convo = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in history[-10:])

        prompt = f"""
You are a friendly, careful medical explainer assistant inside a personal health app.
You do not diagnose; you explain findings, medical terms, prescriptions, and general context, and you
always recommend confirming anything important with a licensed doctor.

{context_block}
Conversation so far:
{convo}

Patient's new question: {question}

Answer clearly and concisely in plain language.
"""
        try:
            response = _model().generate_content(prompt)
            return response.text.strip()
        except Exception:
            logger.exception("Gemini answer_question failed")
            return "Sorry, I couldn't process that question right now. Please try again shortly."

    def _safe_json(self, text: str) -> dict:
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`")
            cleaned = cleaned.replace("json\n", "", 1) if cleaned.startswith("json\n") else cleaned
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            start, end = cleaned.find("{"), cleaned.rfind("}")
            if start != -1 and end != -1:
                try:
                    return json.loads(cleaned[start : end + 1])
                except json.JSONDecodeError:
                    pass
            return {
                "summary_text": cleaned[:600],
                "simplified_explanation": None,
                "abnormal_findings": [],
                "suggested_questions": [],
                "severity_level": "normal",
                "medicines": [],
                "instructions": cleaned[:300],
            }


gemini_service = GeminiService()
