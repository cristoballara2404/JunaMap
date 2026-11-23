import test from 'node:test';
import assert from 'node:assert/strict';
import { crearExigirAdmin } from '../src/middleware/admin.js';
import { crearEstudiantesService } from '../src/services/estudiantes.service.js';

const correr = (mw, cabeceras = {}) => new Promise((res) => mw({ headers: cabeceras }, {}, (err) => res(err ?? null)));

test('admin: sin ADMIN_KEY configurada, la administración de locales queda desactivada (403)', async () => {
  const err = await correr(crearExigirAdmin(''), { 'x-admin-key': 'lo-que-sea' });
  assert.equal(err.status, 403);
});

test('admin: sin cabecera o con clave incorrecta responde 403; con la clave correcta deja pasar', async () => {
  const mw = crearExigirAdmin('clave-secreta-de-admin');
  assert.equal((await correr(mw)).status, 403);
  assert.equal((await correr(mw, { 'x-admin-key': 'otra-clave' })).status, 403);
  assert.equal(await correr(mw, { 'x-admin-key': 'clave-secreta-de-admin' }), null);
});

test('cuenta: eliminar una cuenta existente la borra; si no existe responde 404', async () => {
  let borrado = null;
  const repo = { porId: async (id) => (id === 1 ? { id: 1 } : null), eliminarCuenta: async (id) => { borrado = id; return true; } };
  const s = crearEstudiantesService({ estudiantesRepo: repo, localesRepo: {} });
  await s.eliminarCuenta(1);
  assert.equal(borrado, 1);
  await assert.rejects(s.eliminarCuenta(99), (e) => e.status === 404);
});
