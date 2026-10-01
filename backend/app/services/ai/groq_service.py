import json
import logging

from groq import Groq

from app.core.config import settings

logger = logging.getLogger(__name__)

# Module-level client — re-created when API key changes at runtime
_client: Groq | None = None


def _get_client() -> Groq | None:
    global _client
    if not settings.GROQ_API_KEY:
        logger.warning("GROQ_API_KEY is not set. AI features will return a placeholder.")
        return None
    # Re-create client whenever key might have changed
    _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


def _chat(messages: list[dict], model: str | None = None) -> str:
    client = _get_client()
    if client is None:
        raise RuntimeError("GROQ_API_KEY not configured")
    response = client.chat.completions.create(
        model=model or settings.GROQ_MODEL,
        messages=messages,
        temperature=0.3,
        max_tokens=2048,
    )
    return response.choices[0].message.content


class GroqService:
    """
    Wrapper around the Groq API used across the app for:
    - report summarization
    - prescription analysis
    - medical QA chat
    - translation to Urdu
    """

    def summarize_report(self, extracted_text: str) -> dict:
        if not settings.GROQ_API_KEY:
            return {
                "summary_text": "AI summary unavailable: set GROQ_API_KEY in backend/.env.",
                "simplified_explanation": None,
                "suggested_questions": json.dumps([]),
                "severity_level": "normal",
            }

        prompt = f"""You are a careful, plain-language medical assistant. A patient has uploaded a lab/medical
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
---"""
        try:
            text = _chat([
                {"role": "system", "content": "You are a medical report analysis assistant. Always respond with valid JSON only, no markdown fences."},
                {"role": "user", "content": prompt},
            ])
            data = self._safe_json(text)
            data["suggested_questions"] = json.dumps(data.get("suggested_questions", []))
            return data
        except Exception:
            logger.exception("Groq summarize_report failed")
            return {
                "summary_text": "The AI summary could not be generated right now. Please try again.",
                "simplified_explanation": None,
                "suggested_questions": json.dumps([]),
                "severity_level": "normal",
            }

    def summarize_prescription(self, extracted_text: str) -> dict:
        if not settings.GROQ_API_KEY:
            return {
                "summary_text": "AI prescription analysis unavailable.",
                "medicines": [],
                "instructions": "N/A",
            }

        prompt = f"""You are an expert pharmacist and medical assistant. A patient has uploaded a doctor's prescription.
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
---"""
        try:
            text = _chat([
                {"role": "system", "content": "You are a pharmacist assistant. Always respond with valid JSON only."},
                {"role": "user", "content": prompt},
            ])
            return self._safe_json(text)
        except Exception:
            logger.exception("Groq summarize_prescription failed")
            return {
                "summary_text": "Could not analyze the prescription details automatically.",
                "medicines": [],
                "instructions": "Please consult a healthcare professional for accurate guidance.",
            }

    def translate_to_urdu(self, text: str) -> str:
        if not settings.GROQ_API_KEY:
            return "ترجمہ دستیاب نہیں ہے۔"

        prompt = f"""Translate the following medical explanation/summary text into clear, modern, and easily readable Urdu.
Ensure that while key English medical terms can remain in brackets if helpful, the explanation is simple, polite,
and natural-sounding Urdu.

Text to translate:
---
{text}
---"""
        try:
            return _chat([
                {"role": "system", "content": "You are a medical translation assistant specializing in Urdu translation."},
                {"role": "user", "content": prompt},
            ]).strip()
        except Exception:
            logger.exception("Groq translation failed")
            return "ترجمہ کرنے میں خرابی پیش آئی۔ دوبارہ کوشش کریں۔"

    def answer_question(self, question: str, report_context: str | None, history: list[dict]) -> str:
        if not settings.GROQ_API_KEY:
            return "AI chat is unavailable right now: the server is missing a GROQ_API_KEY."

        context_block = (
            f"Relevant report/prescription content:\n---\n{report_context[:8000]}\n---\n"
            if report_context
            else "No specific report or prescription is attached to this conversation.\n"
        )

        messages = [
            {
                "role": "system",
                "content": (
                    "You are a friendly, careful medical explainer assistant inside a personal health app. "
                    "You do not diagnose; you explain findings, medical terms, prescriptions, and general context, "
                    "and you always recommend confirming anything important with a licensed doctor.\n\n"
                    + context_block
                ),
            }
        ]

        # Add conversation history (last 10 messages)
        for m in history[-10:]:
            messages.append({"role": m["role"], "content": m["content"]})

        messages.append({"role": "user", "content": question})

        try:
            return _chat(messages).strip()
        except Exception:
            logger.exception("Groq answer_question failed")
            return "Sorry, I couldn't process that question right now. Please try again shortly."

    def _safe_json(self, text: str) -> dict:
        cleaned = text.strip()
        # Strip markdown code fences if present
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            cleaned = "\n".join(lines).strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            start, end = cleaned.find("{"), cleaned.rfind("}")
            if start != -1 and end != -1:
                try:
                    return json.loads(cleaned[start: end + 1])
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


groq_service = GroqService()
