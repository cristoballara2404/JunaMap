// Descarga el ícono grande (apple-touch-icon / ícono del sitio) de cada cadena conocida y lo deja en client/public/logos/.
// Se ejecuta en TU computador (necesita internet). Uso:  node scripts/descargar-logos.js
//   --indexar   no descarga; solo vuelve a generar client/src/logos.json con los archivos que ya hay en client/public/logos/
//               (útil si guardas tú mismo un logo a mano: nómbralo con el slug, ej. jumbo.png, santa-isabel.svg).
// Los logos que ya existen en la carpeta NO se reemplazan. Los que falle se avisan al final.
import { mkdirSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { CADENAS } from '../src/services/logos.js';

const DIR = new URL('../../client/public/logos/', import.meta.url);
const MANIFIESTO = new URL('../../client/src/logos.json', import.meta.url);
const ORIGEN = process.env.LOGOS_ORIGEN; // solo para pruebas locales
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const EXT = { 'image/png': 'png', 'image/svg+xml': 'svg', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
mkdirSync(DIR, { recursive: true });

const indexar = () => {
  const m = {};
  for (const f of readdirSync(DIR)) {
    const slug = f.replace(/\.(png|svg|jpg|webp)$/i, '');
    if (slug !== f && CADENAS.some((c) => c[1] === slug)) m[slug] = f;
  }
  writeFileSync(MANIFIESTO, JSON.stringify(m, null, 2) + '\n');
  return m;
};
if (process.argv.includes('--indexar')) { console.log('Índice:', Object.keys(indexar()).join(', ') || '(vacío)'); process.exit(0); }

const pedir = (url, esTexto) => fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' }, redirect: 'follow', signal: AbortSignal.timeout(7000) })
  .then(async (r) => (r.ok ? { r, buf: esTexto ? await r.text() : Buffer.from(await r.arrayBuffer()) } : null)).catch(() => null);
const anchoPng = (b) => (b.length > 24 && b.readUInt32BE(0) === 0x89504e47 ? b.readUInt32BE(16) : 0);

// Candidatos: <link rel="apple-touch-icon|icon"> de la portada (con su tamaño declarado) y rutas típicas.
function candidatos(html, base) {
  const out = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = /rel=["']([^"']+)["']/i.exec(tag)?.[1].toLowerCase() ?? '';
    const href = /href=["']([^"']+)["']/i.exec(tag)?.[1];
    if (!href || !/icon/.test(rel)) continue;
    const tam = Number(/sizes=["'](\d+)x/i.exec(tag)?.[1] ?? 0);
    const apple = rel.includes('apple') ? 1000 : 0;
    const svg = /\.svg(\?|$)/i.test(href) ? 500 : 0;
    try { out.push({ url: new URL(href, base).href, prio: apple + svg + tam }); } catch { /* href inválido */ }
  }
  for (const [ruta, prio] of [['/apple-touch-icon.png', 900], ['/apple-touch-icon-precomposed.png', 890], ['/favicon.svg', 400], ['/favicon.png', 100]]) out.push({ url: new URL(ruta, base).href, prio });
  return out.sort((a, b) => b.prio - a.prio);
}

const resultados = [];
// Segunda fuente: la imagen principal de la página de Wikipedia de la marca (suele ser su logo).
const BUSQUEDA = {
  'santa-isabel': 'Santa Isabel supermercado Chile', jumbo: 'Jumbo supermercado Chile', unimarc: 'Unimarc', lider: 'Líder supermercado Chile',
  tottus: 'Tottus', acuenta: 'Acuenta supermercado', 'mayorista-10': 'Mayorista 10', alvi: 'Alvi supermercados', erbi: 'Erbi supermercado',
  mcdonalds: "McDonald's", kfc: 'KFC', doggis: 'Doggis', dominos: "Domino's Pizza", subway: 'Subway restaurante', 'burger-king': 'Burger King',
  starbucks: 'Starbucks', oxxo: 'OXXO', castano: 'Castaño café Chile',
};
// Íconos de marca de Simple Icons (SVG limpio, sin clave) para cadenas internacionales.
const SIMPLE = { dominos: 'dominos', subway: 'subway', 'burger-king': 'burgerking', starbucks: 'starbucks', mcdonalds: 'mcdonalds', kfc: 'kfc' };
async function simpleIcons(slug) {
  if (!SIMPLE[slug]) return null;
  const d = await pedir(`${process.env.LOGOS_SI ?? 'https://cdn.simpleicons.org'}/${SIMPLE[slug]}`, false);
  const tipo = d?.r.headers.get('content-type')?.split(';')[0].trim();
  return d && tipo === 'image/svg+xml' && d.buf.length > 200 ? { ext: 'svg', buf: d.buf, ancho: 9999, origen: 'Simple Icons' } : null;
}

// Wikipedia: busca la página de la marca y toma SOLO archivos cuyo nombre diga "logo" (nunca fotos del local).
const apiWiki = (lang) => process.env.LOGOS_WIKI ?? `https://${lang}.wikipedia.org/w/api.php`;
const json = async (url) => { const r = await pedir(url, true); try { return JSON.parse(r?.buf ?? '{}'); } catch { return {}; } };
async function wikipedia(slug) {
  const termino = BUSQUEDA[slug] ?? slug;
  for (const lang of ['es', 'en']) {
    const api = apiWiki(lang);
    const hits = (await json(`${api}?action=query&format=json&list=search&srlimit=2&srsearch=${encodeURIComponent(termino)}`)).query?.search ?? [];
    for (const { title } of hits) {
      const imgs = Object.values((await json(`${api}?action=query&format=json&prop=images&imlimit=80&titles=${encodeURIComponent(title)}`)).query?.pages ?? {})[0]?.images ?? [];
      const logos = imgs.map((i) => i.title).filter((t) => /logo|logotipo|isotipo|wordmark/i.test(t) && /\.(svg|png)$/i.test(t) && !/commons-logo|wikimedia|wikipedia|wiki-?logo|flag|bandera|mapa|map\b|edificio|building/i.test(t));
      for (const archivo of logos.slice(0, 3)) {
        const info = Object.values((await json(`${api}?action=query&format=json&prop=imageinfo&iiprop=url&iiurlwidth=300&titles=${encodeURIComponent(archivo)}`)).query?.pages ?? {})[0]?.imageinfo?.[0];
        const url = info?.thumburl ?? info?.url;
        if (!url) continue;
        const d = await pedir(url, false);
        const tipo = d?.r.headers.get('content-type')?.split(';')[0].trim();
        const ext = EXT[tipo];
        if (d && ext && d.buf.length > 200) return { ext, buf: d.buf, ancho: ext === 'png' ? anchoPng(d.buf) : 9999, origen: `Wikipedia (${lang}): ${archivo.replace(/^(File|Archivo):/, '')}` };
      }
    }
  }
  return null;
}

const yaExiste = (slug) => readdirSync(DIR).some((f) => f.startsWith(slug + '.'));

async function buscar(slug, dominio) {
  if (yaExiste(slug)) return 'ya existe (no se reemplaza)';
  let mejor = null, motivo = 'el sitio no respondió o bloquea descargas automáticas';
  for (const host of [`https://www.${dominio}`, `https://${dominio}`]) {
    const base = ORIGEN ?? host;
    const portada = await pedir(base + '/', true);
    if (!portada && !ORIGEN) continue; // el sitio no respondió: prueba la otra dirección
    const lista = candidatos(portada?.buf ?? '', portada?.r.url ?? base);
    for (const c of lista.slice(0, 4)) {
      const d = await pedir(c.url, false);
      const tipo = d?.r.headers.get('content-type')?.split(';')[0].trim();
      const ext = EXT[tipo] ?? (c.url.endsWith('.svg') ? 'svg' : null);
      if (!d || !ext || d.buf.length < 200) continue;
      const ancho = ext === 'png' ? anchoPng(d.buf) : ext === 'svg' ? 9999 : 0;
      if (ext === 'png' && ancho < 96) { motivo = `el ícono del sitio es muy pequeño (${ancho} px)`; continue; } // se vería borroso
      if (!mejor || ancho > mejor.ancho) mejor = { ext, buf: d.buf, ancho };
      if (ancho >= 180) break;
    }
    if (mejor || ORIGEN) break;
  }
  let origen = 'sitio oficial';
  if (!mejor) { mejor = (await simpleIcons(slug)) ?? (await wikipedia(slug)); if (mejor) origen = mejor.origen; }
  if (!mejor) return `NO se pudo: ${motivo}; sin logo en Wikipedia`;
  writeFileSync(new URL(`${slug}.${mejor.ext}`, DIR), mejor.buf);
  return `ok · ${mejor.ext}${mejor.ext === 'png' ? ' ' + mejor.ancho + ' px' : ''} · ${origen}`;
}

// Varias cadenas a la vez y con avance en pantalla (cada sitio espera como máximo unos segundos).
console.log(`Buscando logos de ${CADENAS.length} cadenas…`);
const cola = [...CADENAS];
await Promise.all(Array.from({ length: 6 }, async () => {
  while (cola.length) {
    const [, slug, dominio] = cola.shift();
    const r = await buscar(slug, dominio);
    resultados.push([slug, r]);
    console.log(`${r.startsWith('NO') ? '[x] ' : '[ok]'} ${slug.padEnd(14)} ${r}`);
  }
}));
indexar();
const faltan = resultados.filter(([, r]) => r.startsWith('NO')).map(([s]) => s);
if (faltan.length) console.log(`\nA mano: guarda el logo de ${faltan.join(', ')} en client/public/logos/ con el nombre <slug>.png (o .svg) y corre:\n  node scripts/descargar-logos.js --indexar`);
console.log('\nListo. Recarga la app (Ctrl+F5).');
