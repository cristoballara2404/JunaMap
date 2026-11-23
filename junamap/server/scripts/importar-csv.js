// Carga locales VERIFICADOS por el equipo (por ejemplo, copiados del buscador oficial de Pluxee o Edenred).
// Uso:  node --env-file=.env scripts/importar-csv.js ../db/locales_verificados.csv "Buscador de Pluxee, 23-11-2026"
// El CSV lleva encabezado: nombre,categoria,direccion,horario,lat,lng  (use comillas si un texto lleva comas).
import { readFileSync } from 'node:fs';
import pg from 'pg';

const [archivo, fuenteArg] = process.argv.slice(2);
if (!archivo) {
  console.error('Uso: node --env-file=.env scripts/importar-csv.js <archivo.csv> "<fuente y fecha de verificación>"');
  process.exit(1);
}
const fuente = `Fuente: ${fuenteArg ?? 'buscador oficial del operador'}`.slice(0, 160);

function filaCsv(linea) {
  const celdas = [];
  let actual = '', comillas = false;
  for (const c of linea) {
    if (c === '"') comillas = !comillas;
    else if (c === ',' && !comillas) { celdas.push(actual.trim()); actual = ''; }
    else actual += c;
  }
  celdas.push(actual.trim());
  return celdas;
}

const lineas = readFileSync(archivo, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
const [encabezado, ...filas] = lineas;
const cols = filaCsv(encabezado).map((c) => c.toLowerCase());
for (const n of ['nombre', 'categoria', 'direccion', 'horario', 'lat', 'lng']) {
  if (!cols.includes(n)) { console.error(`Falta la columna "${n}" en el encabezado.`); process.exit(1); }
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
let nuevos = 0, omitidos = 0;
for (const f of filas) {
  const v = Object.fromEntries(filaCsv(f).map((x, i) => [cols[i], x]));
  const la = Number(v.lat), lo = Number(v.lng);
  if (!v.nombre || !Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) {
    console.warn('Fila omitida (datos inválidos):', f); omitidos++; continue;
  }
  const r = await pool.query(
    `INSERT INTO locales (nombre, categoria, direccion, horario, tiene_menu_dia, convenio_vigente, glifo, color_a, color_b,
                          ubicacion, origen, osm_id, convenio_fuente)
     VALUES ($1,$2,$3,$4,FALSE,TRUE,$5,'#FF8A5B','#FF6B35',
             ST_SetSRID(ST_MakePoint($7,$6),4326)::geography,'oficial',$8,$9)
     ON CONFLICT (osm_id) DO NOTHING`,
    [v.nombre.slice(0, 80), (v.categoria || 'Local de comida').slice(0, 60), (v.direccion || 'Dirección por confirmar').slice(0, 120),
     (v.horario || 'Horario por confirmar').slice(0, 60), v.nombre[0].toUpperCase(), la, lo,
     `csv/${v.nombre}|${la},${lo}`.slice(0, 200), fuente],
  );
  nuevos += r.rowCount;
}
console.log(`Filas leídas: ${filas.length}; nuevas guardadas: ${nuevos}; omitidas: ${omitidos}.`);
await pool.end();
