import { pool } from '../config/db.js';

const COLS = 'id, estudiante_id, nombre, categoria, direccion, operador, lat, lng, estado, creado_en';

export const sugerenciasRepo = {
  async crear(d) {
    const { rows } = await pool.query(
      `INSERT INTO sugerencias_locales (estudiante_id, nombre, categoria, direccion, operador, lat, lng)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ${COLS}`,
      [d.estudianteId, d.nombre, d.categoria, d.direccion, d.operador, d.lat, d.lng],
    );
    return rows[0];
  },
  async listar() {
    const { rows } = await pool.query(`SELECT ${COLS} FROM sugerencias_locales ORDER BY creado_en DESC, id DESC`);
    return rows;
  },
};
