import logging

import fitz  # PyMuPDF
import pytesseract
from PIL import Image

from app.core.config import settings

logger = logging.getLogger(__name__)

if settings.TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD


class OCRService:
    """
    Extracts text from an uploaded report.
    - PDFs: try native text extraction first (fast, accurate for digital PDFs),
      fall back to rasterizing pages + Tesseract OCR for scanned PDFs.
    - Images (jpg/png): straight to Tesseract OCR.

    Swap this out for PaddleOCR if you need better multi-language / handwriting support -
    the public interface (extract_text) stays the same.
    """

    def extract_text(self, file_path: str, file_type: str) -> str:
        try:
            if file_type == "pdf":
                return self._extract_from_pdf(file_path)
            return self._extract_from_image(file_path)
        except Exception:
            logger.exception("OCR extraction failed for %s", file_path)
            return ""

    def _extract_from_pdf(self, file_path: str) -> str:
        text_parts: list[str] = []
        with fitz.open(file_path) as doc:
            for page in doc:
                native_text = page.get_text().strip()
                if native_text:
                    text_parts.append(native_text)
                else:
                    pix = page.get_pixmap(dpi=300)
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    text_parts.append(pytesseract.image_to_string(img))
        return "\n".join(text_parts).strip()

    def _extract_from_image(self, file_path: str) -> str:
        img = Image.open(file_path)
        return pytesseract.image_to_string(img).strip()


ocr_service = OCRService()
