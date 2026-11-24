import { AppError } from './errors.js';

const bad = (mensaje) => new AppError(400, mensaje);

export function numero(valor, campo, min, max) {
  if (valor === undefined || valor === null || valor === '') throw bad(`Falta el campo "${campo}".`);
  const n = Number(valor);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw bad(`"${campo}" debe ser un número entre ${min} y ${max}.`);
  }
  return n;
}

export function entero(valor, campo, min = 1, max = 2_000_000_000) {
  const n = numero(valor, campo, min, max);
  if (!Number.isInteger(n)) throw bad(`"${campo}" debe ser un número entero.`);
  return n;
}

export function texto(valor, campo, min, max) {
  if (typeof valor !== 'string') throw bad(`Falta el campo "${campo}" (texto).`);
  const t = valor.trim();
  if (t.length < min || t.length > max) throw bad(`"${campo}" debe tener entre ${min} y ${max} caracteres.`);
  return t;
}

export function opcion(valor, campo, permitidas) {
  if (!permitidas.includes(valor)) throw bad(`"${campo}" debe ser uno de: ${permitidas.join(', ')}.`);
  return valor;
}

export function booleano(valor, campo, porDefecto) {
  if (valor === undefined) return porDefecto;
  if (typeof valor !== 'boolean') throw bad(`"${campo}" debe ser verdadero o falso.`);
  return valor;
}

const HEX = /^#[0-9a-fA-F]{6}$/;
export function color(valor, campo, porDefecto) {
  if (valor === undefined) return porDefecto;
  if (typeof valor !== 'string' || !HEX.test(valor)) throw bad(`"${campo}" debe ser un color como #FF6B35.`);
  return valor;
}

export function validarLocal(body = {}) {
  const local = {
    nombre: texto(body.nombre, 'nombre', 3, 80),
    categoria: texto(body.categoria, 'categoria', 3, 60),
    direccion: texto(body.direccion, 'direccion', 5, 120),
    horario: texto(body.horario, 'horario', 3, 60),
    nota_menu: body.nota_menu == null ? null : texto(body.nota_menu, 'nota_menu', 1, 120),
    tiene_menu_dia: booleano(body.tiene_menu_dia, 'tiene_menu_dia', false),
    convenio_vigente: booleano(body.convenio_vigente, 'convenio_vigente', true),
    glifo: texto(body.glifo ?? String(body.nombre ?? '?').trim()[0], 'glifo', 1, 1).toUpperCase(),
    color_a: color(body.color_a, 'color_a', '#FF8A5B'),
    color_b: color(body.color_b, 'color_b', '#FF6B35'),
    lat: numero(body.lat, 'lat', -90, 90),
    lng: numero(body.lng, 'lng', -180, 180),
  };
  if (body.menu !== undefined) {
    if (!Array.isArray(body.menu) || body.menu.length > 20) throw bad('"menu" debe ser una lista de hasta 20 platos.');
    local.menu = body.menu.map((m, i) => ({
      nombre: texto(m?.nombre, `menu[${i}].nombre`, 2, 80),
      precio: entero(m?.precio, `menu[${i}].precio`, 1, 1_000_000),
    }));
  }
  if (body.promo !== undefined) {
    local.promo = body.promo === null ? null : {
      titulo: texto(body.promo.titulo, 'promo.titulo', 3, 80),
      precio: entero(body.promo.precio, 'promo.precio', 1, 1_000_000),
      precio_original: entero(body.promo.precio_original, 'promo.precio_original', 1, 1_000_000),
    };
  }
  return local;
}

export function validarResena(body = {}) {
  return {
    autor: texto(body.autor, 'autor', 2, 40),
    carrera: texto(body.carrera, 'carrera', 2, 60),
    estrellas: entero(body.estrellas, 'estrellas', 1, 5),
    comentario: texto(body.comentario, 'comentario', 5, 300),
  };
}

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function correo(valor) {
  const c = texto(valor, 'correo', 5, 120).toLowerCase();
  if (!CORREO.test(c)) throw bad('Escribe un correo válido, por ejemplo nombre@correo.cl.');
  return c;
}
export function clave(valor, campo = 'contraseña') {
  if (typeof valor !== 'string' || valor.length < 8 || valor.length > 72) throw bad(`La ${campo} debe tener entre 8 y 72 caracteres.`);
  return valor;
}
export function validarRegistro(body = {}) {
  if (body.acepta !== true) throw bad('Debes aceptar el aviso de privacidad para crear tu cuenta.');
  return {
    nombre: texto(body.nombre, 'nombre', 2, 80),
    carrera: texto(body.carrera, 'carrera', 2, 60),
    operador: opcion(body.operador ?? 'Pluxee', 'operador', ['Pluxee', 'Edenred']),
    correo: correo(body.correo),
    clave: clave(body.clave),
  };
}
export function validarLogin(body = {}) {
  if (typeof body.clave !== 'string' || !body.clave) throw bad('Escribe tu contraseña.');
  return { correo: correo(body.correo), clave: body.clave.slice(0, 72) };
}
/** Reseña del usuario con sesión: autor y carrera salen de su cuenta, no del cuerpo. */
export function validarResenaSesion(body = {}) {
  return {
    estrellas: entero(body.estrellas, 'estrellas', 1, 5),
    comentario: texto(body.comentario, 'comentario', 5, 300),
  };
}

/** Local que un estudiante notifica: nombre y dirección obligatorios; categoría, operador y coordenadas opcionales. */
export function validarSugerencia(b = {}) {
  const OPERADORES = ['Pluxee', 'Edenred', 'Ambos'];
  const conLat = b.lat !== undefined && b.lat !== null && b.lat !== '';
  const conLng = b.lng !== undefined && b.lng !== null && b.lng !== '';
  if (conLat !== conLng) throw bad('Envía latitud y longitud juntas, o ninguna.');
  return {
    nombre: texto(b.nombre, 'nombre', 2, 80),
    direccion: texto(b.direccion, 'direccion', 5, 120),
    categoria: b.categoria === undefined ? 'Local de comida' : texto(b.categoria, 'categoria', 2, 60),
    operador: b.operador === undefined ? 'Ambos' : opcion(b.operador, 'operador', OPERADORES),
    lat: conLat ? numero(b.lat, 'lat', -90, 90) : null,
    lng: conLng ? numero(b.lng, 'lng', -180, 180) : null,
  };
}
