import test from 'node:test';
import assert from 'node:assert/strict';
import { numero, entero, validarLocal, validarResena } from '../src/middleware/validators.js';

test('numero rechaza valores fuera de rango o no numéricos con 400', () => {
  assert.throws(() => numero('abc', 'lat', -90, 90), (e) => e.status === 400);
  assert.throws(() => numero('120', 'lat', -90, 90), (e) => e.status === 400);
  assert.equal(numero('-33.45', 'lat', -90, 90), -33.45);
});
test('entero rechaza decimales', () => {
  assert.throws(() => entero('2.5', 'id'), (e) => e.status === 400);
});
test('validarResena exige estrellas entre 1 y 5', () => {
  const base = { autor: 'Ana', carrera: 'Ing. Civil', comentario: 'Muy rico todo' };
  assert.throws(() => validarResena({ ...base, estrellas: 6 }), (e) => e.status === 400);
  assert.equal(validarResena({ ...base, estrellas: 5 }).estrellas, 5);
});
test('validarLocal aplica valores por defecto y limpia espacios', () => {
  const l = validarLocal({ nombre: '  Café Sol ', categoria: 'Café', direccion: 'Calle 123', horario: 'hasta 18:00', lat: -33.4, lng: -70.6 });
  assert.equal(l.nombre, 'Café Sol');
  assert.equal(l.convenio_vigente, true);
  assert.equal(l.glifo, 'C');
});
