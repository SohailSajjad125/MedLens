import logging
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.admin.admin_routes import router as admin_router
from app.api.auth.auth_routes import router as auth_router
from app.api.chat.chat_routes import router as chat_router
from app.api.doctor.doctor_routes import router as doctor_router
from app.api.profile_routes import router as profile_router
from app.api.report.report_routes import router as report_router
from app.core.config import settings

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered medical report analyzer & digital health platform.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.include_router(auth_router)
app.include_router(report_router)
app.include_router(chat_router)
app.include_router(doctor_router)
app.include_router(admin_router)
app.include_router(profile_router)


@app.get("/")
def root():
    return {"app": settings.APP_NAME, "status": "running", "docs": "/docs"}


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


# ── SPA catch-all: serve index.html for any non-API route ────────────────────
# This enables consistent page reload on deep-linked SPA routes in production.
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")

@app.get("/{full_path:path}", include_in_schema=False)
async def spa_fallback(full_path: str, request: Request):
    index_path = os.path.join(FRONTEND_DIST, "index.html")
    # Only serve index.html for non-API paths where the file exists
    if full_path.startswith("api/") or full_path.startswith("uploads/"):
        from fastapi import HTTPException
        raise HTTPException(status_code=404)
    if os.path.exists(index_path):
        return FileResponse(index_path)
    # In dev mode (frontend served separately), just 404
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Frontend not built. Run 'npm run build' in the frontend directory.")
