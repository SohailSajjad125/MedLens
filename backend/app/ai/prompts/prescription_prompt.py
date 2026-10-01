"""
Prompt template for prescription analysis (Phase 3).
Wire this into a new services/prescription/prescription_service.py using the same
pattern as report_service.py: OCR the prescription image/PDF, then call Gemini with
this prompt to identify medicines, dosages, usage instructions and common side effects.
"""

PRESCRIPTION_ANALYSIS_INSTRUCTIONS = """
Respond with STRICT JSON only with a "medicines" array, where each item has:
name, dosage, frequency, usage_instructions, common_side_effects (array).
Only report what is legible in the text; do not guess illegible medicine names.
"""
