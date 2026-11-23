-- Mueve los locales de demostración (ficticios) alrededor de TU ubicación, para probar el mapa real.
-- 1) Cambia lat y lng por tu posición (en Google Maps: clic derecho sobre el lugar → copiar coordenadas).
-- 2) Ejecútalo UNA sola vez. Para volver a empezar, carga de nuevo schema.sql y seed.sql.
WITH destino AS (SELECT -33.4500::float AS lat, -70.6600::float AS lng),   -- <- EDITA ESTOS DOS VALORES
     origen  AS (SELECT -33.4230::float AS lat, -70.6430::float AS lng)    -- campus de referencia del seed
UPDATE locales l
   SET ubicacion = ST_Translate(l.ubicacion::geometry, d.lng - o.lng, d.lat - o.lat)::geography
  FROM destino d, origen o;
