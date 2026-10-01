import os
import uuid

from fastapi import UploadFile

from app.core.config import settings

ALLOWED_EXTENSIONS = {"pdf", "jpg", "jpeg", "png"}


def save_upload(file: UploadFile, subfolder: str = "reports") -> tuple[str, str]:
    """Saves an UploadFile to disk and returns (file_path, file_type)."""
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file type: .{ext}")

    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    contents = file.file.read()
    if len(contents) > max_bytes:
        raise ValueError(f"File exceeds the {settings.MAX_UPLOAD_MB}MB upload limit.")

    target_dir = os.path.join(settings.UPLOAD_DIR, subfolder)
    os.makedirs(target_dir, exist_ok=True)

    unique_name = f"{uuid.uuid4().hex}.{ext}"
    full_path = os.path.join(target_dir, unique_name)

    with open(full_path, "wb") as out_file:
        out_file.write(contents)

    file_type = "pdf" if ext == "pdf" else ("jpg" if ext in ("jpg", "jpeg") else "png")
    return full_path, file_type
