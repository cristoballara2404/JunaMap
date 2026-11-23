// Genera docs/junamap.postman_collection.json (Postman v2.1) con las peticiones de la demostración.
// Orden de uso: 0a/0b (sesión) -> 1 a 4 (CRUD de locales) -> 5 a 8 (pedidos) -> errores.
import { writeFileSync } from 'node:fs';
const base = '{{base}}';
const esAdmin = (m, p) => m !== 'GET' && p.startsWith('/locales') && !p.includes('?');
const privada = (p) => p.startsWith('/pedidos');
const guardar = (lineas) => [{ listen: 'test', script: { type: 'text/javascript', exec: lineas } }];
const r = (name, method, path, body, tests) => ({
  name,
  event: tests ? guardar(tests) : undefined,
  request: {
    method,
    header: [
      ...(body ? [{ key: 'Content-Type', value: 'application/json' }] : []),
      ...(esAdmin(method, path) ? [{ key: 'x-admin-key', value: '{{admin_key}}' }] : []),
      ...(privada(path) ? [{ key: 'Authorization', value: 'Bearer {{token}}' }] : []),
    ],
    url: { raw: `${base}${path}`, host: [base], path: path.replace(/\?.*/, '').split('/').filter(Boolean), query: path.includes('?') ? path.split('?')[1].split('&').map((p) => ({ key: p.split('=')[0], value: p.split('=')[1] })) : [] },
    ...(body ? { body: { mode: 'raw', raw: JSON.stringify(body, null, 2) } } : {}),
  },
});
const nuevo = { nombre: 'Panadería La Espiga', categoria: 'Panadería', direccion: 'Av. Recoleta 1200', horario: 'hasta las 19:00', tiene_menu_dia: false, lat: -33.4241, lng: -70.6418, menu: [{ nombre: 'Marraqueta', precio: 300 }], promo: { titulo: 'Pan + café', precio: 1800, precio_original: 2400 } };
const token = ["const d = pm.response.json();", "pm.collectionVariables.set('token', d.token);"];
const col = {
  info: { name: 'JunaMap · Hitos 2 y 3 (demostración)', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
  variable: [
    { key: 'base', value: 'http://localhost:3000/api/v1' },
    { key: 'admin_key', value: '' },
    { key: 'correo', value: 'demo@junamap.test' },
    { key: 'clave', value: 'demo12345' },
    { key: 'token', value: '' },
    { key: 'local_id', value: '' },
    { key: 'pedido_id', value: '' },
  ],
  item: [
    r('0a. Crear cuenta de prueba (solo la primera vez; guarda el token)', 'POST', '/auth/registro', { nombre: 'Cuenta Demo', carrera: 'Ingeniería', operador: 'Pluxee', correo: '{{correo}}', clave: '{{clave}}', acepta: true }, token),
    r('0b. Ingresar (guarda el token; úsala si la cuenta ya existe)', 'POST', '/auth/login', { correo: '{{correo}}', clave: '{{clave}}' }, token),
    r('1. Leer: locales cercanos (400 m)', 'GET', '/locales?lat=-33.423&lng=-70.643&radio=400&orden=cercania'),
    r('2. Crear: local nuevo (guarda su id)', 'POST', '/locales', nuevo, ["const d = pm.response.json();", "pm.collectionVariables.set('local_id', d.id);"]),
    r('3. Actualizar: cambiar horario del local creado', 'PUT', '/locales/{{local_id}}', { ...nuevo, horario: 'hasta las 20:00' }),
    r('4. Borrar: el local creado', 'DELETE', '/locales/{{local_id}}'),
    r('5. Crear pedido con promo (guarda su id)', 'POST', '/pedidos', { promo_id: 1 }, ["const d = pm.response.json();", "pm.collectionVariables.set('pedido_id', d.id);"]),
    r('6. Listar mis pedidos', 'GET', '/pedidos'),
    r('7. Actualizar: marcar el pedido como retirado', 'PATCH', '/pedidos/{{pedido_id}}', { estado: 'retirado' }),
    r('Error 400: latitud inválida', 'GET', '/locales?lat=abc&lng=-70.6'),
    r('Error 404: local inexistente', 'GET', '/locales/9999'),
    r('Error 409: cancelar un pedido ya retirado', 'PATCH', '/pedidos/{{pedido_id}}', { estado: 'cancelado' }),
  ],
};
writeFileSync(new URL('./junamap.postman_collection.json', import.meta.url), JSON.stringify(col, null, 2));
