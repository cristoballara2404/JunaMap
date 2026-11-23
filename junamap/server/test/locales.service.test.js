import test from 'node:test';
import assert from 'node:assert/strict';
import { crearLocalesService } from '../src/services/locales.service.js';

const fila = (id, dist, nota, menu = false) => ({ id, distancia_m: dist, calificacion: nota, tiene_menu_dia: menu });
function armar(filas) {
  const llamadas = [];
  const repo = { buscarCerca: async (a) => { llamadas.push(a); return filas; } };
  return { llamadas, servicio: crearLocalesService({ localesRepo: repo, config: { radioDefecto: 400 } }) };
}

test('usa radio 400 m por defecto, pide solo convenios vigentes y ordena por cercanía', async () => {
  const { servicio, llamadas } = armar([fila(1, 350.4, 4.3), fila(2, 120.2, 4.7), fila(3, 240, 4.5)]);
  const r = await servicio.listarCerca({ lat: -33.42, lng: -70.64 });
  assert.equal(llamadas[0].radio, 400);
  assert.equal(llamadas[0].soloVigentes, true);
  assert.deepEqual(r.locales.map((l) => l.id), [2, 3, 1]);
  assert.equal(r.locales[0].distancia_m, 120);
});

test('ordena por calificación y filtra por menú del día', async () => {
  const { servicio } = armar([fila(1, 100, 4.1, true), fila(2, 200, 4.9, true), fila(3, 50, 5, false)]);
  const r = await servicio.listarCerca({ lat: 0, lng: 0, orden: 'calificacion', soloMenu: true });
  assert.deepEqual(r.locales.map((l) => l.id), [2, 1]);
});

test('rechaza una promo cuyo precio no es menor al original (422)', async () => {
  const { servicio } = armar([]);
  await assert.rejects(
    servicio.crear({ promo: { titulo: 'x', precio: 5000, precio_original: 4000 } }),
    (e) => e.status === 422,
  );
});
