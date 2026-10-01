"""
Prompt templates used by services/ai/gemini_service.py.
Kept separate from service logic so prompts can be tuned without touching code paths.
"""

REPORT_SUMMARY_INSTRUCTIONS = """
Respond with STRICT JSON only (no markdown fences) with keys:
summary_text, simplified_explanation, abnormal_findings (array),
suggested_questions (array), severity_level (normal|watch|urgent).
Never provide a diagnosis - only explain what the report literally shows.
"""
