import test from 'node:test';
import assert from 'node:assert/strict';
import { firmar, verificar } from '../src/services/tokens.js';
import { crearAuthService, hashClave, claveCorrecta } from '../src/services/auth.service.js';
import { validarRegistro, validarLogin } from '../src/middleware/validators.js';
import { crearExigirSesion, soloPropio } from '../src/middleware/sesion.js';

const config = { jwtSecret: 'secreto-de-prueba', sesionDias: 7 };

test('token: se verifica con la misma clave y se rechaza si lo alteran, expira o usa otra clave', () => {
  const t = firmar({ sub: '5' }, 'k', 60);
  assert.equal(verificar(t, 'k').sub, '5');
  assert.equal(verificar(t, 'otra'), null);
  assert.equal(verificar(t.slice(0, -2) + 'xx', 'k'), null);
  const [h, , s] = t.split('.');
  assert.equal(verificar(`${h}.${Buffer.from('{"sub":"1","exp":9999999999}').toString('base64url')}.${s}`, 'k'), null);
  assert.equal(verificar(t, 'k', Date.now() + 120_000), null);
  assert.equal(verificar('basura', 'k'), null);
});

test('la clave se guarda con hash y sal, y solo la correcta coincide', async () => {
  const h = await hashClave('mi-clave-segura');
  assert.ok(h.startsWith('scrypt$') && !h.includes('mi-clave-segura'));
  assert.equal(await claveCorrecta('mi-clave-segura', h), true);
  assert.equal(await claveCorrecta('otra-clave-123', h), false);
  assert.notEqual(h, await hashClave('mi-clave-segura'));
});

function armar(cuentas = []) {
  const repo = {
    porCorreo: async (c) => cuentas.find((x) => x.correo === c) ?? null,
    crearCuenta: async (d) => {
      if (cuentas.some((x) => x.correo === d.correo)) return null;
      const e = { id: cuentas.length + 1, nombre: d.nombre, carrera: d.carrera, operador: d.operador, correo: d.correo, clave_hash: d.claveHash };
      cuentas.push(e); return e.id;
    },
    porId: async (id) => cuentas.find((x) => x.id === id) ?? null,
  };
  return crearAuthService({ estudiantesRepo: repo, config });
}
const datos = { nombre: 'Camila Reyes', carrera: 'Ingeniería Civil', operador: 'Pluxee', correo: 'cami@mayor.cl', clave: 'clave-larga-1', acepta: true };

test('registrar crea la cuenta y entrega token sin exponer la clave', async () => {
  const r = await armar().registrar(datos);
  assert.equal(verificar(r.token, config.jwtSecret).sub, String(r.estudiante.id));
  assert.equal(JSON.stringify(r).includes('clave'), false);
});

test('no se puede registrar dos veces el mismo correo (409)', async () => {
  const s = armar();
  await s.registrar(datos);
  await assert.rejects(s.registrar(datos), (e) => e.status === 409);
});

test('login: clave correcta entra; clave o correo erróneos dan el mismo 401', async () => {
  const s = armar();
  await s.registrar(datos);
  assert.ok((await s.ingresar({ correo: datos.correo, clave: datos.clave })).token);
  const mal1 = await s.ingresar({ correo: datos.correo, clave: 'incorrecta-123' }).catch((e) => e);
  const mal2 = await s.ingresar({ correo: 'nadie@mayor.cl', clave: datos.clave }).catch((e) => e);
  assert.equal(mal1.status, 401);
  assert.equal(mal2.status, 401);
  assert.equal(mal1.message, mal2.message);
});

test('validación: correo con formato, contraseña de 8+ y operador permitido', () => {
  assert.equal(validarRegistro({ ...datos, correo: ' CAMI@Mayor.cl ' }).correo, 'cami@mayor.cl');
  assert.throws(() => validarRegistro({ ...datos, correo: 'no-es-correo' }), (e) => e.status === 400);
  assert.throws(() => validarRegistro({ ...datos, clave: 'corta' }), (e) => e.status === 400);
  assert.throws(() => validarRegistro({ ...datos, operador: 'Otro' }), (e) => e.status === 400);
  assert.throws(() => validarRegistro({ ...datos, acepta: false }), (e) => e.status === 400);
  assert.throws(() => validarLogin({ correo: 'a@b.cl' }), (e) => e.status === 400);
});

test('middleware: sin token o con token inválido responde 401; con token deja el id; soloPropio da 403', () => {
  const exigir = crearExigirSesion(config.jwtSecret);
  const llamar = (headers) => { const req = { headers }; let err; exigir(req, {}, (e) => { err = e; }); return { req, err }; };
  assert.equal(llamar({}).err.status, 401);
  assert.equal(llamar({ authorization: 'Bearer falso' }).err.status, 401);
  const ok = llamar({ authorization: `Bearer ${firmar({ sub: '3' }, config.jwtSecret, 60)}` });
  assert.equal(ok.err, undefined);
  assert.equal(ok.req.estudianteId, 3);
  let e1; soloPropio({ params: { id: '4' }, estudianteId: 3 }, {}, (e) => { e1 = e; });
  assert.equal(e1.status, 403);
  let e2; soloPropio({ params: { id: '3' }, estudianteId: 3 }, {}, (e) => { e2 = e; });
  assert.equal(e2, undefined);
});
