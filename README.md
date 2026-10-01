# MedLens AI — AI-Powered Medical Report Analyzer & Digital Health Platform

A full-stack portfolio project: patients upload lab reports/prescriptions, the backend
runs OCR + Gemini AI analysis, and results are shown in a glassmorphism/neomorphism
React dashboard with dark/light themes, trend charts, a per-report Q&A chat, doctor
sharing, and an admin panel.

```
medlens/
├── backend/     FastAPI + SQLAlchemy + MySQL + Gemini + OCR
├── frontend/    React (Vite) + glassmorphism/neomorphism UI
└── database/    SQL scripts (create DB, seed roles/admin)
```

## What is fully working out of the box

- Registration / login with **JWT** auth, **bcrypt** password hashing, role-based access
  (`patient`, `doctor`, `admin`) looked up by name (never hardcoded IDs).
- Report upload (PDF/JPG/PNG, drag & drop) → OCR text extraction (PyMuPDF for digital
  PDFs, Tesseract OCR fallback for scans/images) → structured lab-value extraction →
  **Gemini API** summary, plain-language explanation, abnormal-value flags, severity
  level, and suggested doctor questions.
- Report list/search/sort/favorite/delete/download, report detail viewer (summary /
  extracted text / lab values tabs), report comparison with trend detection.
- **AI Chat Q&A** — both a general assistant and a per-report chat that answers
  questions using that report's extracted text as context, powered by Gemini.
- Health profile (BMI, blood group, allergies), family member management.
- Doctor portal (view reports shared with you) + patient-side report sharing/revoke.
- Admin panel (user list, deactivate users, platform stats).
- Dark/light theme toggle, responsive layout, every dashboard card/button is clickable
  and routes to real detail views (no dead UI).

## What is scaffolded as an extension point (not fully built)

These are wired into the data model and noted in code comments so you can finish them
incrementally for your FYP write-up:
- Prescription analyzer (prompt template ready in `backend/app/ai/prompts/prescription_prompt.py`)
- Health timeline / analytics charts beyond the comparison view (recharts is already a
  frontend dependency — see `ReportValue` model for the data you'd chart)
- Google OAuth login (config keys reserved in `.env`, `google_id` column exists on `User`)
- Urdu translation & text-to-speech (`language` field exists in `UserSetting`)
- Email notifications (the `Notification` model + endpoints exist; wire up an SMTP
  sender, e.g. `fastapi-mail`, in a new `services/notification/notification_service.py`)
- Rate limiting / audit log writing (the `AuditLog` model exists; call it from
  `core/dependencies.py` or add `slowapi` middleware)

---

## 1. Prerequisites

- Python 3.11+
- Node.js 18+
- MySQL 8+
- Tesseract OCR installed on your system (for scanned images/PDFs):
  - Ubuntu/Debian: `sudo apt install tesseract-ocr`
  - macOS: `brew install tesseract`
  - Windows: install from https://github.com/UB-Mannheim/tesseract/wiki and set
    `TESSERACT_CMD` in `backend/.env` to the installed `tesseract.exe` path.
- A Gemini API key from https://aistudio.google.com/apikey

---

## 2. Database setup (MySQL)

Run these two SQL files, in order, using the MySQL client or a GUI (Workbench/DBeaver):

```bash
mysql -u root -p < database/01_create_database.sql
```

This creates the `medlens_db` database and a `medlens_user` account. **Edit the
password inside `01_create_database.sql` before running it**, and use the same
password in `backend/.env`.

Tables themselves are created by Alembic (step 3 below), not by raw SQL — the schema
lives in `backend/app/models/*.py` as the single source of truth. After running
`alembic upgrade head`, seed the lookup data:

```bash
mysql -u root -p < database/02_seed_roles_admin.sql
```

This inserts the three roles (`admin`, `doctor`, `patient`) that the app looks up by
name, plus a demo admin account:
- **email:** `admin@medlens.local`
- **password:** `Admin@12345` (change it after first login)

---

## 3. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env
# Edit .env: set DB_USER / DB_PASSWORD / DB_NAME, JWT_SECRET_KEY, and GEMINI_API_KEY

# Create the tables (reads models automatically from app/models/__init__.py)
alembic revision --autogenerate -m "initial schema"
alembic upgrade head

# Then run the seed script from step 2 (02_seed_roles_admin.sql) if you haven't yet.

uvicorn app.main:app --reload --port 8000
```

- API root: http://localhost:8000
- Interactive Swagger docs: **http://localhost:8000/docs**
- Health check: http://localhost:8000/api/health

### Registering a doctor account

The public `/api/auth/register` endpoint always creates a `patient`. To create a
doctor or promote a user, update their role directly in MySQL (or build an admin UI
action later):

```sql
UPDATE users u
JOIN roles r ON r.name = 'doctor'
SET u.role_id = r.id
WHERE u.email = 'doctor@example.com';
```

---

## 4. Frontend setup

```bash
cd frontend
npm install

cp .env.example .env
# VITE_API_BASE_URL should point at your running backend, e.g. http://localhost:8000

npm run dev
```

Open **http://localhost:5173** — you'll land on the glassmorphism login page, with a
link to the register page. After logging in you're routed to the correct dashboard
based on your role (patient/doctor/admin).

---

## 5. Getting a Gemini API key

1. Go to https://aistudio.google.com/apikey
2. Create a key (a free tier is available).
3. Paste it into `backend/.env` as `GEMINI_API_KEY=...`.
4. Restart the backend. If the key is missing, AI summary/chat endpoints still work
   but return a clear placeholder message instead of crashing.

---

## 6. Project architecture (backend)

```
backend/app/
├── core/            config, database session, JWT + bcrypt, auth dependencies
├── models/          one SQLAlchemy model per file; __init__.py registers all of them
├── schemas/         pydantic request/response schemas, grouped by feature
├── repositories/    plain DB-access classes (no business logic)
├── services/        business logic (auth, report pipeline, chat, Gemini, OCR)
├── ai/prompts/      the actual prompt text used by the Gemini service (edit here)
├── api/             FastAPI routers + thin controllers per feature
└── main.py          app assembly, CORS, static file mount for uploads
```

Reports are processed **synchronously** on upload for portfolio simplicity (the
request waits for OCR + Gemini before responding). For a production system, move
`ReportService._run_ai_pipeline` into a background task or a queue (Celery/RQ) and
notify the frontend via the existing `Notification` model when it's done.

## 7. Project architecture (frontend)

```
frontend/src/
├── api/             axios client + one function per backend endpoint
├── context/          Auth + Theme React contexts
├── components/       Sidebar, Topbar, Logo, icon set, glass/neo layout pieces
├── pages/             one file per route
└── styles/            global.css (design tokens, glassmorphism, neomorphism, buttons),
                        auth.css, dashboard.css
```

The design system lives entirely in CSS custom properties in `global.css` — the
`[data-theme="dark"]` / `[data-theme="light"]` blocks at the top define every color,
so retheming is a matter of editing those two blocks rather than hunting through
components.

---

## 8. Security notes

- Passwords are hashed with **bcrypt** (`passlib`) — never stored in plain text.
- JWT tokens are signed with `JWT_SECRET_KEY` — **change the default value** in
  `.env` before deploying anywhere real.
- File uploads are restricted by extension and size (`MAX_UPLOAD_MB` in `.env`).
- Role checks happen server-side via `require_roles(...)` in `core/dependencies.py` —
  the frontend route guard is a UX convenience, not the security boundary.
- Uploaded files are served from `/uploads` as static files for simplicity; for a
  real deployment put them behind signed URLs or an authenticated proxy route instead.

## 9. Troubleshooting

| Symptom | Likely cause |
|---|---|
| `alembic revision --autogenerate` produces an empty migration | Alembic couldn't import your models — check `DATABASE_URL` in `.env` is reachable |
| OCR returns empty text on a scanned PDF | Tesseract isn't installed / not on PATH — set `TESSERACT_CMD` |
| AI summary says "AI summary unavailable" | `GEMINI_API_KEY` missing or invalid in `backend/.env` |
| 401 errors immediately after login | Check `JWT_SECRET_KEY` didn't change between token issue and validation (e.g. server restarted with a different `.env`) |
| CORS errors in the browser console | Confirm `FRONTEND_URL` in `backend/.env` matches the URL you're actually loading the frontend from |
