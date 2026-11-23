import { pool, transaccion } from '../config/db.js';

const COLS = `l.id, l.nombre, l.categoria, l.direccion, l.horario, l.nota_menu, l.tiene_menu_dia,
  l.convenio_vigente, l.glifo, l.color_a, l.color_b, l.origen, l.convenio_fuente,
  ST_Y(l.ubicacion::geometry) AS lat, ST_X(l.ubicacion::geometry) AS lng,
  COALESCE(r.prom, 0)::float AS calificacion, COALESCE(r.n, 0)::int AS n_resenas,
  p.id AS promo_id, p.titulo AS promo_titulo, p.precio AS promo_precio, p.precio_original AS promo_precio_original`;
const JOINS = `LEFT JOIN (SELECT local_id, ROUND(AVG(estrellas), 1) AS prom, COUNT(*) AS n
                          FROM resenas GROUP BY local_id) r ON r.local_id = l.id
               LEFT JOIN promos p ON p.local_id = l.id`;

function mapear(f) {
  const { promo_id, promo_titulo, promo_precio, promo_precio_original, ...resto } = f;
  return {
    ...resto,
    promo: promo_id
      ? { id: promo_id, titulo: promo_titulo, precio: promo_precio, precio_original: promo_precio_original }
      : null,
  };
}

export const localesRepo = {
  async buscarCerca({ lat, lng, radio, soloVigentes, limite = 300 }) {
    const { rows } = await pool.query(
      `SELECT ${COLS},
              ST_Distance(l.ubicacion, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography)::float AS distancia_m
         FROM locales l ${JOINS}
        WHERE ST_DWithin(l.ubicacion, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)
          AND ($4::boolean = FALSE OR l.convenio_vigente)
        ORDER BY distancia_m
        LIMIT $5`,
      [lat, lng, radio, soloVigentes, limite],
    );
    return rows.map(mapear);
  },

  async porId(id) {
    const { rows } = await pool.query(`SELECT ${COLS} FROM locales l ${JOINS} WHERE l.id = $1`, [id]);
    if (!rows[0]) return null;
    const menu = await pool.query('SELECT id, nombre, precio FROM menu_items WHERE local_id = $1 ORDER BY id', [id]);
    return { ...mapear(rows[0]), menu: menu.rows };
  },

  async promoPorId(promoId) {
    const { rows } = await pool.query(
      `SELECT p.id, p.titulo, p.precio, l.id AS local_id, l.nombre AS local_nombre, l.convenio_vigente
         FROM promos p JOIN locales l ON l.id = p.local_id WHERE p.id = $1`,
      [promoId],
    );
    return rows[0] ?? null;
  },

  crear(d) {
    return transaccion(async (c) => {
      const { rows } = await c.query(
        `INSERT INTO locales (nombre, categoria, direccion, horario, nota_menu, tiene_menu_dia,
                              convenio_vigente, glifo, color_a, color_b, ubicacion)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, ST_SetSRID(ST_MakePoint($12,$11),4326)::geography)
         RETURNING id`,
        [d.nombre, d.categoria, d.direccion, d.horario, d.nota_menu, d.tiene_menu_dia,
         d.convenio_vigente, d.glifo, d.color_a, d.color_b, d.lat, d.lng],
      );
      const id = rows[0].id;
      await reemplazarMenu(c, id, d.menu);
      if (d.promo) await guardarPromo(c, id, d.promo);
      return id;
    });
  },

  actualizar(id, d) {
    return transaccion(async (c) => {
      const { rowCount } = await c.query(
        `UPDATE locales SET nombre=$2, categoria=$3, direccion=$4, horario=$5, nota_menu=$6,
                tiene_menu_dia=$7, convenio_vigente=$8, glifo=$9, color_a=$10, color_b=$11,
                ubicacion=ST_SetSRID(ST_MakePoint($13,$12),4326)::geography
          WHERE id=$1`,
        [id, d.nombre, d.categoria, d.direccion, d.horario, d.nota_menu, d.tiene_menu_dia,
         d.convenio_vigente, d.glifo, d.color_a, d.color_b, d.lat, d.lng],
      );
      if (!rowCount) return false;
      await reemplazarMenu(c, id, d.menu);
      if (d.promo === null) await c.query('DELETE FROM promos WHERE local_id = $1', [id]);
      else if (d.promo) await guardarPromo(c, id, d.promo);
      return true;
    });
  },

  async eliminar(id) {
    const { rowCount } = await pool.query('DELETE FROM locales WHERE id = $1', [id]);
    return rowCount > 0;
  },
};

async function reemplazarMenu(c, localId, menu) {
  if (menu === undefined) return;
  await c.query('DELETE FROM menu_items WHERE local_id = $1', [localId]);
  for (const m of menu) {
    await c.query('INSERT INTO menu_items (local_id, nombre, precio) VALUES ($1,$2,$3)', [localId, m.nombre, m.precio]);
  }
}

function guardarPromo(c, localId, p) {
  return c.query(
    `INSERT INTO promos (local_id, titulo, precio, precio_original) VALUES ($1,$2,$3,$4)
     ON CONFLICT (local_id) DO UPDATE SET titulo = EXCLUDED.titulo, precio = EXCLUDED.precio,
                                          precio_original = EXCLUDED.precio_original`,
    [localId, p.titulo, p.precio, p.precio_original],
  );
}
