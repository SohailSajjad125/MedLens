-- ============================================================
-- MedLens AI - Database bootstrap script
-- Run this FIRST, before starting the backend or running Alembic.
-- ============================================================

CREATE DATABASE IF NOT EXISTS medlens_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Dedicated app user (recommended over using root).
-- Change the password, and match it in backend/.env (DB_USER / DB_PASSWORD).
CREATE USER IF NOT EXISTS 'medlens_user'@'localhost' IDENTIFIED BY '3369@50aSo';
GRANT ALL PRIVILEGES ON medlens_db.* TO 'medlens_user'@'localhost';
FLUSH PRIVILEGES;
