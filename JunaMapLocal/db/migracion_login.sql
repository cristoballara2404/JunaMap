-- Agrega el inicio de sesión a una base que ya existe (no borra datos).
-- Uso: psql -d junamap -f db/migracion_login.sql
-- Las bases nuevas creadas con db/schema.sql ya lo incluyen.
ALTER TABLE estudiantes ADD COLUMN IF NOT EXISTS correo VARCHAR(120);
ALTER TABLE estudiantes ADD COLUMN IF NOT EXISTS clave_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_estudiantes_correo ON estudiantes (lower(correo));
ALTER TABLE resenas ADD COLUMN IF NOT EXISTS estudiante_id INT REFERENCES estudiantes(id) ON DELETE SET NULL;
