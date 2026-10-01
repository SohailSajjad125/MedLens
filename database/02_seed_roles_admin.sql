-- ============================================================
-- MedLens AI - Seed data
-- Run this AFTER `alembic upgrade head` has created the tables.
-- ============================================================

USE medlens_db;

-- Roles are looked up by name in code (never hardcoded IDs).
INSERT INTO roles (name) VALUES ('admin')   ON DUPLICATE KEY UPDATE name = name;
INSERT INTO roles (name) VALUES ('doctor')  ON DUPLICATE KEY UPDATE name = name;
INSERT INTO roles (name) VALUES ('patient') ON DUPLICATE KEY UPDATE name = name;

-- Optional: create a demo admin account.
-- Password below is the bcrypt hash of "Admin@12345".
-- Generate your own hash with:
--   python -c "from passlib.context import CryptContext; print(CryptContext(schemes=['bcrypt']).hash('YourPassword'))"
INSERT INTO users (role_id, full_name, email, password_hash, is_active, is_verified)
SELECT r.id, 'System Admin', 'admin@medlens.local',
       '$2b$12$RsOkBHOQjRTwDnvLlP7iHemx5ADnj9CXVOhTFqLhxki0X1JS/Q1k.',
       1, 1
FROM roles r WHERE r.name = 'admin'
ON DUPLICATE KEY UPDATE email = email;

-- The hash above is a real bcrypt hash for the password: Admin@12345
-- Log in with admin@medlens.local / Admin@12345, then change the password.
-- To generate a hash for a different password:
--   python -c "import bcrypt; print(bcrypt.hashpw(b'YourPassword', bcrypt.gensalt()).decode())"
