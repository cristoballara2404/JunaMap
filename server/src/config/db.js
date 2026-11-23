import pg from 'pg';
import { config } from './index.js';

export const pool = new pg.Pool({ connectionString: config.databaseUrl });

/** Ejecuta fn(client) dentro de una transacción; hace ROLLBACK si falla. */
export async function transaccion(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
