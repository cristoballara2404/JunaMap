import { useEffect, useState } from 'react';
import { CAMPUS } from './api.js';

export const clp = (n) => '$' + Number(n).toLocaleString('es-CL');
export const stars = (r) => '★'.repeat(Math.round(r));
export const colores = (l) => [l.color_a, l.color_b];

import logosLocales from './logos.json';

/** Orden de preferencia: archivo propio descargado en /logos (alta calidad) y, si no hay, el favicon. */
export function logoFuentes(l) {
  const propio = l.logo_slug && logosLocales[l.logo_slug];
  // Si hay archivo propio, no se usa el favicon de Google (sale borroso).
  return propio ? [`/logos/${propio}`] : [l.logo_url].filter(Boolean);
}
const MIN_PX = 64; // un ícono más pequeño se ve borroso al agrandarlo: se descarta y se muestra la letra

/** Logo de la cadena; si no carga, es muy pequeño o no existe, muestra `fallback`. */
export function Logo({ l, fallback = null, cls = 'logo-img' }) {
  const fuentes = logoFuentes(l);
  const [i, setI] = useState(0);
  useEffect(() => setI(0), [l.id]);
  if (i >= fuentes.length) return fallback;
  return (
    <img className={cls} src={fuentes[i]} alt={`Logo de ${l.nombre}`} loading="lazy" onError={() => setI(i + 1)}
      onLoad={(e) => { if (e.currentTarget.naturalWidth < MIN_PX && !fuentes[i].endsWith('.svg')) setI(i + 1); }} />
  );
}

export function Tile({ l, cls = '' }) {
  const glifo = <span>{l.glifo}</span>;
  if (!l.logo_url) return <div className={`tile ${cls}`} style={{ '--a': l.color_b }}>{glifo}</div>;
  return <div className={`tile logo ${cls}`} style={{ '--a': l.color_b }}><Logo l={l} fallback={glifo} /></div>;
}

/** Distancia en metros entre dos puntos (fórmula de Haversine). */
export function distanciaM(lat1, lng1, lat2, lng2) {
  const r = Math.PI / 180, R = 6371000;
  const a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lng2 - lng1) * r) / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

/** Carga datos y expone { data, loading, error, recargar }. */
export function useAsync(fn, deps) {
  const [estado, setEstado] = useState({ data: null, loading: true, error: null });
  const [n, setN] = useState(0);
  useEffect(() => {
    let vivo = true;
    setEstado((e) => ({ ...e, loading: true, error: null }));
    fn()
      .then((data) => vivo && setEstado({ data, loading: false, error: null }))
      .catch((e) => vivo && setEstado({ data: null, loading: false, error: e.message }));
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n]);
  return { ...estado, recargar: () => setN((x) => x + 1) };
}

/** Estados de carga, error y vacío; si hay datos, dibuja los hijos. */
export function Estado({ q, vacio, esVacio, children }) {
  if (q.loading && !q.data) return <div className="state"><span className="spin" />Cargando…</div>;
  if (q.error) {
    return (
      <div className="state err">
        {q.error}
        <br /><button className="mini" onClick={q.recargar}>Reintentar</button>
      </div>
    );
  }
  if (esVacio) return <div className="state">{vacio}</div>;
  return children;
}

/** Proyecta lat/lng al dibujo del mapa (campus en el centro, 400 m = radio de 96 px). */
export function posicion(l) {
  const dx = (l.lng - CAMPUS.lng) * 92900;
  const dy = (l.lat - CAMPUS.lat) * 111200;
  const k = 96 / 400;
  return {
    x: Math.min(350, Math.max(25, 127 + dx * k)),
    y: Math.min(318, Math.max(34, 166 - dy * k)),
  };
}
