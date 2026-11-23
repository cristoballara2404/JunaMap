// Importa sucursales REALES de cadenas citadas en prensa como adheridas a la tarjeta Junaeb,
// usando los datos abiertos de OpenStreetMap (Overpass API). Requiere internet.
// Uso:  node --env-file=.env scripts/importar-osm.js <lat> <lng> [radio_m] [--seco] [--archivo=datos.json]
// Ej.:  node --env-file=.env scripts/importar-osm.js -33.511 -70.758 2500
//
// Si Overpass está caído (502 / timeouts), hay una salida sin depender de él:
//   1) corre el script con  --imprimir-consulta  y pega el texto en https://overpass-turbo.eu  → Ejecutar → Exportar → «datos crudos OSM (JSON)»
//   2) guarda el JSON y corre:  node --env-file=.env scripts/importar-osm.js --archivo=overpass.json
//   --seco  muestra lo encontrado sin escribir en la base de datos.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import pg from 'pg';

const args = process.argv.slice(2);
const banderas = args.filter((a) => a.startsWith('--'));
const pos = args.filter((a) => !a.startsWith('--')).map(Number);
const opcion = (n) => banderas.find((b) => b.startsWith(`--${n}=`))?.split('=').slice(1).join('=');
const seco = banderas.includes('--seco');
const archivo = opcion('archivo');
const [lat, lng, radio = 2500] = pos;
if (!archivo && ![lat, lng, radio].every(Number.isFinite)) {
  console.error('Uso: node --env-file=.env scripts/importar-osm.js <lat> <lng> [radio_m] [--seco] [--archivo=datos.json] [--imprimir-consulta]');
  process.exit(1);
}
// Cadenas que la prensa cita como adheridas a la Tarjeta Junaeb (Canal 13, 24horas, Redgol).
// OJO: que una cadena esté adherida no garantiza que cada sucursal lo esté: por eso la app lo advierte.
const CADENAS = ['Jumbo', 'Unimarc', 'Santa Isabel', 'Mayorista 10', 'Alvi', 'Líder', 'Lider', 'Acuenta', 'Tottus', 'Erbi'];
const FUENTE = 'Cadena citada en prensa como adherida a la tarjeta Junaeb; confirma la sucursal en el buscador de tu operador.';
// Servidores públicos de Overpass (se prueban en orden). Si uno falla se pasa al siguiente.
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass.nchc.org.tw/api/interpreter',
];
const CACHE = new URL('./.overpass-cache.json', import.meta.url);

const RE = `(^|[ ])(${CADENAS.join('|')})`;
// Consulta liviana: timeout corto (los servidores descartan rápido las consultas pesadas y se reintenta en otro),
// sin 'department_store' (no aplica) y sin repetir 'nwr' dos veces: nodos y áreas por separado con 'out center'.
const TIENDA = '^(supermarket|wholesale|convenience)$';
const filtro = (campo) => `["shop"~"${TIENDA}"]["${campo}"~"${RE}",i](around:${radio},${lat},${lng})`;
const consulta = `[out:json][timeout:25];
(
  node${filtro('brand')};
  way${filtro('brand')};
  node${filtro('name')};
  way${filtro('name')};
);
out center tags;`;

if (banderas.includes('--imprimir-consulta')) { console.log(consulta); process.exit(0); }

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

// Prueba varios servidores públicos y reintenta con espera creciente: Overpass se satura con frecuencia (502/504/timeouts).
async function overpass() {
  const errores = [];
  let vacio = null;
  for (let ronda = 1; ronda <= 3; ronda++) {
    for (const url of ENDPOINTS) {
      const host = new URL(url).host;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json', 'User-Agent': 'JunaMap-proyecto-universitario/1.0 (Universidad Mayor)' },
          body: 'data=' + encodeURIComponent(consulta),
          signal: AbortSignal.timeout(35000),
        });
        if (res.ok) {
          const datos = await res.json();
          // Overpass a veces responde 200 con un 'remark' de timeout y resultados incompletos.
          if (datos.remark && /timed out|out of memory|error/i.test(datos.remark)) throw new Error(datos.remark);
          // Una respuesta vacía puede ser un espejo con datos parciales: se verifica en otro servidor antes de aceptarla.
          if (!datos.elements?.length && vacio === null) { vacio = datos; errores.push(`${host}: 0 resultados`); console.warn(`${host} respondió sin resultados; verifico en otro servidor…`); continue; }
          writeFileSync(CACHE, JSON.stringify(datos));
          return datos;
        }
        errores.push(`${host}: ${res.status}`);
        console.warn(`${host} respondió ${res.status}; probando otro servidor…`);
      } catch (e) {
        errores.push(`${host}: ${e.message}`);
        console.warn(`${host} falló (${e.message}); probando otro servidor…`);
      }
    }
    if (ronda < 3) { console.warn(`Ronda ${ronda} sin éxito; espero ${ronda * 10} s…`); await pausa(ronda * 10000); }
  }
  if (vacio) return vacio;
  throw new Error(
    'Ningún servidor de Overpass respondió.\n' +
    '  • Reintenta en unos minutos o baja el radio (ej. 1500).\n' +
    '  • O usa la vía manual: corre con --imprimir-consulta, pégala en https://overpass-turbo.eu, exporta el JSON\n' +
    '    y luego: node --env-file=.env scripts/importar-osm.js --archivo=overpass.json\n' +
    '  Detalle: ' + errores.slice(-ENDPOINTS.length).join(' | '),
  );
}

let datos;
if (archivo) {
  if (!existsSync(archivo)) { console.error(`No existe el archivo ${archivo}`); process.exit(1); }
  datos = JSON.parse(readFileSync(archivo, 'utf8'));
  console.log(`Leyendo ${archivo}…`);
} else {
  datos = await overpass();
}
// Sin duplicados (un mismo local puede salir por 'brand' y por 'name').
const elements = [...new Map((datos.elements ?? []).map((e) => [`${e.type}/${e.id}`, e])).values()];
if (elements.length === 0) {
  console.log(`Encontradas 0 sucursales${archivo ? '' : ` en ${radio} m`}. Puede que OpenStreetMap no las tenga etiquetadas ahí: prueba un radio mayor u otro sector.`);
  process.exit(0);
}
if (seco) {
  for (const e of elements) {
    const t = e.tags ?? {};
    console.log(`${e.type}/${e.id}\t${t.name ?? t.brand}\t${e.lat ?? e.center?.lat},${e.lon ?? e.center?.lon}\t${[t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ')}`);
  }
  console.log(`(modo --seco) ${elements.length} sucursales; no se escribió nada en la base de datos.`);
  process.exit(0);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
let nuevos = 0;
for (const e of elements) {
  const t = e.tags ?? {};
  const nombre = t.name ?? t.brand;
  const la = e.lat ?? e.center?.lat, lo = e.lon ?? e.center?.lon;
  if (!la || !lo || !nombre) continue;
  const direccion = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ') || 'Dirección por confirmar';
  const r = await pool.query(
    `INSERT INTO locales (nombre, categoria, direccion, horario, tiene_menu_dia, convenio_vigente, glifo, color_a, color_b,
                          ubicacion, origen, osm_id, convenio_fuente)
     VALUES ($1,'Supermercado',$2,$3,FALSE,TRUE,$4,'#2F9E6B','#1B6B47',
             ST_SetSRID(ST_MakePoint($6,$5),4326)::geography,'osm',$7,$8)
     ON CONFLICT (osm_id) DO NOTHING`,
    [nombre.slice(0, 80), direccion.slice(0, 120), (t.opening_hours ?? 'Horario por confirmar').slice(0, 60),
     nombre[0].toUpperCase(), la, lo, `${e.type}/${e.id}`, FUENTE],
  );
  nuevos += r.rowCount;
}
console.log(`Encontradas ${elements.length} sucursales; nuevas guardadas: ${nuevos}.`);
await pool.end();
