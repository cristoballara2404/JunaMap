// Agrega lat/lng a una lista de locales usando Nominatim (OpenStreetMap). Requiere internet; ~1 s por local.
// Uso:  node scripts/geocodificar-csv.js ../db/locales_junaeb_excel.csv ../db/locales_verificados.csv
// Entrada: columnas nombre,categoria,direccion,horario,comuna,consulta   Salida: nombre,categoria,direccion,horario,lat,lng
// Las direcciones que no se encuentran con número se buscan solo por calle y se marcan «(aprox.)» en la consola: revísalas.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const [entrada, salida] = process.argv.slice(2);
if (!entrada || !salida) { console.error('Uso: node scripts/geocodificar-csv.js <entrada.csv> <salida.csv>'); process.exit(1); }

function filaCsv(linea) {
  const celdas = []; let actual = '', comillas = false;
  for (const c of linea) {
    if (c === '"') comillas = !comillas;
    else if (c === ',' && !comillas) { celdas.push(actual.trim()); actual = ''; }
    else actual += c;
  }
  celdas.push(actual.trim());
  return celdas;
}
const esc = (v) => (/[",\n]/.test(v) ? `"${String(v).replaceAll('"', '""')}"` : String(v));
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const CACHE = new URL('./.geocoder-cache.json', import.meta.url);
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};

async function buscar(q) {
  if (q in cache) return cache[q];
  for (let i = 1; i <= 3; i++) {
    try {
      const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=cl&q=' + encodeURIComponent(q);
      const res = await fetch(url, { headers: { 'User-Agent': 'JunaMap-proyecto-universitario/1.0 (Universidad Mayor)' }, signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const [r] = await res.json();
      const v = r ? { lat: Number(r.lat), lng: Number(r.lon) } : null;
      cache[q] = v; writeFileSync(CACHE, JSON.stringify(cache));
      await pausa(1100); // política de uso de Nominatim: máx. 1 consulta por segundo
      return v;
    } catch (e) { console.warn(`  reintento ${i} (${e.message})`); await pausa(3000 * i); }
  }
  return null;
}

const [enc, ...filas] = readFileSync(entrada, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
const cols = filaCsv(enc).map((c) => c.toLowerCase());
const salidaFilas = [['nombre', 'categoria', 'direccion', 'horario', 'lat', 'lng']];
let ok = 0, aprox = 0, fallidas = 0;
for (const f of filas) {
  const v = Object.fromEntries(filaCsv(f).map((x, i) => [cols[i], x]));
  let p = await buscar(v.consulta), marca = '';
  if (!p) { // sin número de calle: ubica la calle, no el local exacto
    p = await buscar(v.consulta.replace(/\s\d+[^,]*(?=,)/, '')); marca = ' (aprox.)';
  }
  if (!p) { console.warn(`✗ ${v.nombre} · ${v.direccion}: no encontrada`); fallidas++; continue; }
  marca ? aprox++ : ok++;
  console.log(`✓ ${v.nombre} · ${v.direccion} → ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}${marca}`);
  salidaFilas.push([v.nombre, v.categoria, v.direccion, v.horario, p.lat, p.lng]);
}
writeFileSync(salida, '﻿' + salidaFilas.map((r) => r.map(esc).join(',')).join('\n') + '\n');
console.log(`\nListo: ${ok} exactas, ${aprox} aproximadas, ${fallidas} sin encontrar → ${salida}`);
