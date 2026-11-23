-- Para bases YA creadas: agrega las columnas que usa el importador de locales reales. Ejecutar una vez.
ALTER TABLE locales ADD COLUMN IF NOT EXISTS origen VARCHAR(10) NOT NULL DEFAULT 'demo';
ALTER TABLE locales ADD COLUMN IF NOT EXISTS osm_id TEXT UNIQUE;
ALTER TABLE locales ADD COLUMN IF NOT EXISTS convenio_fuente VARCHAR(160);
