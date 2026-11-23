import { pool } from '../config/db.js';

const COLS = 'id, estudiante_id, promo_id, local_nombre, promo_titulo, codigo, valor_promo, costo_servicio, estado, creado_en';

export const pedidosRepo = {
  async listarPorEstudiante(estudianteId) {
    const { rows } = await pool.query(`SELECT ${COLS} FROM pedidos WHERE estudiante_id = $1 ORDER BY creado_en DESC, id DESC`, [estudianteId]);
    return rows;
  },
  async porId(id) {
    const { rows } = await pool.query(`SELECT ${COLS} FROM pedidos WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },
  /** Devuelve null si el código ya existe (el servicio genera otro y reintenta). */
  async crear(d) {
    const { rows } = await pool.query(
      `INSERT INTO pedidos (estudiante_id, promo_id, local_nombre, promo_titulo, codigo, valor_promo, costo_servicio)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (codigo) DO NOTHING RETURNING ${COLS}`,
      [d.estudianteId, d.promoId, d.localNombre, d.promoTitulo, d.codigo, d.valorPromo, d.costoServicio],
    );
    return rows[0] ?? null;
  },
  async actualizarEstado(id, estado) {
    const { rows } = await pool.query(`UPDATE pedidos SET estado = $2 WHERE id = $1 RETURNING ${COLS}`, [id, estado]);
    return rows[0] ?? null;
  },
  async eliminar(id) {
    const { rowCount } = await pool.query('DELETE FROM pedidos WHERE id = $1', [id]);
    return rowCount > 0;
  },
};
