// Logos de las cadenas conocidas. No se guardan imágenes: el navegador las pide al servicio público de favicons de Google
// (https://www.google.com/s2/favicons) a partir del sitio de cada cadena. Si quieres un logo mejor, guarda el archivo
// en client/public/logos/ y la app lo usará en lugar del favicon (ver server/scripts/descargar-logos.js).
export const CADENAS = [
  // [expresión sobre el nombre, slug, dominio]
  [/santa\s*isabel/i, 'santa-isabel', 'santaisabel.cl'],
  [/jumbo/i, 'jumbo', 'jumbo.cl'],
  [/unimarc/i, 'unimarc', 'unimarc.cl'],
  [/l[ií]der/i, 'lider', 'lider.cl'],
  [/tottus/i, 'tottus', 'tottus.cl'],
  [/acuenta|a cuenta/i, 'acuenta', 'acuenta.cl'],
  [/mayorista\s*10/i, 'mayorista-10', 'mayorista10.cl'],
  [/\balvi\b/i, 'alvi', 'alvi.cl'],
  [/erbi/i, 'erbi', 'erbi.cl'],
  [/mc\s?donald/i, 'mcdonalds', 'mcdonalds.cl'],
  [/\bkfc\b/i, 'kfc', 'kfc.cl'],
  [/doggis/i, 'doggis', 'doggis.cl'],
  [/dom[ií]n[oó]/i, 'dominos', 'dominos.cl'],
  [/subway/i, 'subway', 'subway.com'],
  [/burger\s*king/i, 'burger-king', 'burgerking.cl'],
  [/starbucks/i, 'starbucks', 'starbucks.cl'],
  [/oxxo/i, 'oxxo', 'oxxo.cl'],
  [/casta[ñn]o/i, 'castano', 'castano.cl'],
];

/** Devuelve { logo_slug, logo_url } si el nombre corresponde a una cadena conocida; si no, { logo_slug: null, logo_url: null }. */
export function logoDeCadena(nombre = '') {
  const limpio = String(nombre).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’´`]/g, "'"); // sin tildes ni apóstrofes raros
  const c = CADENAS.find(([re]) => re.test(limpio) || re.test(nombre));
  if (!c) return { logo_slug: null, logo_url: null };
  return { logo_slug: c[1], logo_url: `https://www.google.com/s2/favicons?domain=${c[2]}&sz=128` };
}
