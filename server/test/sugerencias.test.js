import test from 'node:test';
import assert from 'node:assert/strict';
import { validarSugerencia } from '../src/middleware/validators.js';
import { crearSugerenciasService } from '../src/services/sugerencias.service.js';

test('sugerencia: con nombre y dirección válidos aplica valores por defecto', () => {
  const s = validarSugerencia({ nombre: '  Doña Rosa ', direccion: 'Av. Providencia 1234' });
  assert.deepEqual(s, { nombre: 'Doña Rosa', direccion: 'Av. Providencia 1234', categoria: 'Local de comida', operador: 'Ambos', lat: null, lng: null });
});

test('sugerencia: rechaza nombre corto, dirección corta y operador inválido (400)', () => {
  assert.throws(() => validarSugerencia({ nombre: 'A', direccion: 'Av. Providencia 1234' }), (e) => e.status === 400);
  assert.throws(() => validarSugerencia({ nombre: 'Doña Rosa', direccion: 'Av' }), (e) => e.status === 400);
  assert.throws(() => validarSugerencia({ nombre: 'Doña Rosa', direccion: 'Av. Providencia 1234', operador: 'Otro' }), (e) => e.status === 400);
});

test('sugerencia: latitud y longitud van juntas y dentro de rango', () => {
  const base = { nombre: 'Doña Rosa', direccion: 'Av. Providencia 1234' };
  assert.throws(() => validarSugerencia({ ...base, lat: -33.4 }), (e) => e.status === 400);
  assert.throws(() => validarSugerencia({ ...base, lat: 120, lng: -70 }), (e) => e.status === 400);
  const ok = validarSugerencia({ ...base, lat: '-33.42', lng: -70.64 });
  assert.equal(ok.lat, -33.42);
});

test('sugerencia: sin estudiante existente responde 401; con estudiante se guarda a su nombre', async () => {
  let guardada = null;
  const repo = { crear: async (d) => { guardada = d; return { id: 1, ...d, estado: 'pendiente' }; }, listar: async () => [] };
  const est = { porId: async (id) => (id === 7 ? { id: 7 } : null) };
  const s = crearSugerenciasService({ sugerenciasRepo: repo, estudiantesRepo: est });
  await assert.rejects(s.crear(99, { nombre: 'X' }), (e) => e.status === 401);
  const r = await s.crear(7, { nombre: 'Doña Rosa', direccion: 'Av. Providencia 1234', categoria: 'Local de comida', operador: 'Ambos', lat: null, lng: null });
  assert.equal(guardada.estudianteId, 7);
  assert.equal(r.estado, 'pendiente');
});
