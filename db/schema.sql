-- JunaMap · modelo de datos (PostgreSQL 15+ con PostGIS).
-- Uso: psql -d junamap -f db/schema.sql && psql -d junamap -f db/seed.sql
CREATE EXTENSION IF NOT EXISTS postgis;

DROP TABLE IF EXISTS sugerencias_locales, favoritos, pedidos, resenas, menu_items, promos, estudiantes, locales CASCADE;

CREATE TABLE locales (
  id               SERIAL PRIMARY KEY,
  nombre           VARCHAR(80)  NOT NULL,
  categoria        VARCHAR(60)  NOT NULL,
  direccion        VARCHAR(120) NOT NULL,
  horario          VARCHAR(60)  NOT NULL,
  nota_menu        VARCHAR(120),
  tiene_menu_dia   BOOLEAN NOT NULL DEFAULT FALSE,
  convenio_vigente BOOLEAN NOT NULL DEFAULT TRUE,
  glifo            CHAR(1) NOT NULL,
  color_a          CHAR(7) NOT NULL DEFAULT '#FF8A5B',
  color_b          CHAR(7) NOT NULL DEFAULT '#FF6B35',
  ubicacion        GEOGRAPHY(Point, 4326) NOT NULL,
  origen           VARCHAR(10) NOT NULL DEFAULT 'demo',   -- 'demo' (ficticio) u 'osm' (importado de OpenStreetMap)
  osm_id           TEXT UNIQUE,
  convenio_fuente  VARCHAR(160),
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_locales_ubicacion ON locales USING GIST (ubicacion);

CREATE TABLE menu_items (
  id       SERIAL PRIMARY KEY,
  local_id INT NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  nombre   VARCHAR(80) NOT NULL,
  precio   INT NOT NULL CHECK (precio > 0)
);

-- Una promo vigente por local (UNIQUE) en esta versión.
CREATE TABLE promos (
  id              SERIAL PRIMARY KEY,
  local_id        INT NOT NULL UNIQUE REFERENCES locales(id) ON DELETE CASCADE,
  titulo          VARCHAR(80) NOT NULL,
  precio          INT NOT NULL CHECK (precio > 0),
  precio_original INT NOT NULL CHECK (precio_original > precio)
);

CREATE TABLE resenas (
  id        SERIAL PRIMARY KEY,
  local_id  INT NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  autor     VARCHAR(40) NOT NULL,
  carrera   VARCHAR(60) NOT NULL,
  estrellas SMALLINT NOT NULL CHECK (estrellas BETWEEN 1 AND 5),
  comentario VARCHAR(300) NOT NULL,
  creada_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_resenas_local ON resenas(local_id);

CREATE TABLE estudiantes (
  id       SERIAL PRIMARY KEY,
  nombre   VARCHAR(80) NOT NULL,
  carrera  VARCHAR(60) NOT NULL,
  operador VARCHAR(10) NOT NULL DEFAULT 'Pluxee' CHECK (operador IN ('Pluxee','Edenred')),
  correo     VARCHAR(120),   -- inicio de sesión (NULL en la estudiante ficticia del seed)
  clave_hash TEXT            -- scrypt con sal; nunca se envía al cliente
);
CREATE UNIQUE INDEX idx_estudiantes_correo ON estudiantes (lower(correo));

-- Autoría de la reseña: solo quien la escribió puede editarla o borrarla (NULL en reseñas del seed).
ALTER TABLE resenas ADD COLUMN estudiante_id INT REFERENCES estudiantes(id) ON DELETE SET NULL;

CREATE TABLE favoritos (
  estudiante_id INT NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
  local_id      INT NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  PRIMARY KEY (estudiante_id, local_id)
);

-- Los pedidos guardan una copia del nombre del local y de la promo para conservar el historial.
CREATE TABLE pedidos (
  id             SERIAL PRIMARY KEY,
  estudiante_id  INT NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
  promo_id       INT REFERENCES promos(id) ON DELETE SET NULL,
  local_nombre   VARCHAR(80) NOT NULL,
  promo_titulo   VARCHAR(80) NOT NULL,
  codigo         VARCHAR(10) NOT NULL UNIQUE,
  valor_promo    INT NOT NULL,
  costo_servicio INT NOT NULL,
  estado         VARCHAR(12) NOT NULL DEFAULT 'por_retirar'
                 CHECK (estado IN ('por_retirar','retirado','cancelado')),
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pedidos_estudiante ON pedidos(estudiante_id, creado_en DESC);

-- Locales que las y los estudiantes notifican como aceptados con la BAES; un administrador los revisa antes de publicarlos.
CREATE TABLE sugerencias_locales (
  id            SERIAL PRIMARY KEY,
  estudiante_id INT NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
  nombre        VARCHAR(80)  NOT NULL,
  categoria     VARCHAR(60)  NOT NULL,
  direccion     VARCHAR(120) NOT NULL,
  operador      VARCHAR(10)  NOT NULL DEFAULT 'Ambos' CHECK (operador IN ('Pluxee','Edenred','Ambos')),
  lat           DOUBLE PRECISION CHECK (lat BETWEEN -90 AND 90),
  lng           DOUBLE PRECISION CHECK (lng BETWEEN -180 AND 180),
  estado        VARCHAR(12)  NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aprobado','rechazado')),
  creado_en     TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_sugerencias_estado ON sugerencias_locales(estado, creado_en DESC);
