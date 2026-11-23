import { pool, transaccion } from '../config/db.js';

export const estudiantesRepo = {
  /** Incluye clave_hash: solo para el login; nunca se envía al cliente. */
  async porCorreo(correo) {
    const { rows } = await pool.query('SELECT id, nombre, carrera, operador, clave_hash FROM estudiantes WHERE lower(correo) = lower($1)', [correo]);
    return rows[0] ?? null;
  },
  /** Devuelve el id nuevo, o null si el correo ya estaba registrado. */
  async crearCuenta({ nombre, carrera, operador, correo, claveHash }) {
    const { rows } = await pool.query(
      `INSERT INTO estudiantes (nombre, carrera, operador, correo, clave_hash) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT ((lower(correo))) DO NOTHING RETURNING id`,
      [nombre, carrera, operador, correo, claveHash],
    );
    return rows[0]?.id ?? null;
  },
  async porId(id) {
    const { rows } = await pool.query(
      `SELECT e.id, e.nombre, e.carrera, e.operador,
              (SELECT COUNT(*) FROM pedidos  WHERE estudiante_id = e.id)::int AS n_pedidos,
              (SELECT COUNT(*) FROM favoritos WHERE estudiante_id = e.id)::int AS n_favoritos
         FROM estudiantes e WHERE e.id = $1`,
      [id],
    );
    return rows[0] ?? null;
  },
  async actualizarOperador(id, operador) {
    const { rowCount } = await pool.query('UPDATE estudiantes SET operador = $2 WHERE id = $1', [id, operador]);
    return rowCount > 0;
  },
  /** Borra la cuenta y todo lo que dejó: reseñas (texto y nombre visible), y por cascada pedidos y favoritos. */
  eliminarCuenta(id) {
    return transaccion(async (c) => {
      await c.query('DELETE FROM resenas WHERE estudiante_id = $1', [id]);
      const { rowCount } = await c.query('DELETE FROM estudiantes WHERE id = $1', [id]);
      return rowCount > 0;
    });
  },
  async listarFavoritos(id) {
    const { rows } = await pool.query(
      `SELECT l.id, l.nombre, l.categoria, l.glifo, l.color_a, l.color_b
         FROM favoritos f JOIN locales l ON l.id = f.local_id WHERE f.estudiante_id = $1 ORDER BY l.nombre`,
      [id],
    );
    return rows;
  },
  async agregarFavorito(id, localId) {
    await pool.query('INSERT INTO favoritos (estudiante_id, local_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [id, localId]);
  },
  async quitarFavorito(id, localId) {
    const { rowCount } = await pool.query('DELETE FROM favoritos WHERE estudiante_id=$1 AND local_id=$2', [id, localId]);
    return rowCount > 0;
  },
};
