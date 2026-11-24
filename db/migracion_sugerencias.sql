CREATE TABLE IF NOT EXISTS sugerencias_locales (
  id            SERIAL PRIMARY KEY,
  estudiante_id INT NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
  nombre        VARCHAR(80) NOT NULL,
  categoria     VARCHAR(60) NOT NULL,
  direccion     VARCHAR(120) NOT NULL,
  operador      VARCHAR(10) NOT NULL DEFAULT 'Ambos'
                CHECK (operador IN ('Pluxee','Edenred','Ambos')),
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  estado        VARCHAR(12) NOT NULL DEFAULT 'pendiente'
                CHECK (estado IN ('pendiente','aprobado','rechazado')),
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()