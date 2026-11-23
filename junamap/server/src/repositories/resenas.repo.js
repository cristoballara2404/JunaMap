import { pool } from '../config/db.js';

const COLS = 'id, local_id, autor, carrera, estrellas, comentario, creada_en';

export const resenasRepo = {
  async listarPorLocal(localId) {
    const { rows } = await pool.query(`SELECT ${COLS} FROM resenas WHERE local_id = $1 ORDER BY creada_en DESC, id DESC`, [localId]);
    return rows;
  },
  async crear(localId, d) {
    const { rows } = await pool.query(
      `INSERT INTO resenas (local_id, estudiante_id, autor, carrera, estrellas, comentario) VALUES ($1,$2,$3,$4,$5,$6) RETURNING ${COLS}`,
      [localId, d.estudianteId, d.autor, d.carrera, d.estrellas, d.comentario],
    );
    return rows[0];
  },
  async actualizar(id, estudianteId, d) {
    const { rows } = await pool.query(
      `UPDATE resenas SET estrellas=$3, comentario=$4 WHERE id=$1 AND estudiante_id=$2 RETURNING ${COLS}`,
      [id, estudianteId, d.estrellas, d.comentario],
    );
    return rows[0] ?? null;
  },
  async eliminar(id, estudianteId) {
    const { rowCount } = await pool.query('DELETE FROM resenas WHERE id = $1 AND estudiante_id = $2', [id, estudianteId]);
    return rowCount > 0;
  },
};
