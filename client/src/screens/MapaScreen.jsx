import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../api.js';
import { Estado, Tile, clp, distanciaM, logoFuentes, useAsync } from '../util.jsx';
import { useSesion } from '../sesion.js';


const FILTROS = [
  ['near', 'Más cerca', { orden: 'cercania' }],
  ['top', 'Mejor calificados', { orden: 'calificacion' }],
  ['menu', 'Menú del día', { orden: 'cercania', soloMenu: true }],
];
const ZOOM_INICIAL = 16, ZOOM_MIN = 12, ZOOM_PRECIOS = 16; // bajo este zoom se ocultan los precios para no saturar el mapa
const MAX_LISTA = 60; // tarjetas dibujadas bajo el mapa (los pines siempre son todos los de la zona)
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`);

const saludo = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
};

// Pin naranja con la inicial (o el logo de la cadena) y el precio de la promo al lado.
const iconoPin = (l, sel) => {
  const [src, alt] = logoFuentes(l);
  const img = src ? `<img src="${esc(src)}" alt="" ${alt ? `data-f="${esc(alt)}"` : ''}
    onload="if(this.naturalWidth<64&&!/\\.svg$/.test(this.src)){this.onerror()}"
    onerror="if(this.dataset.f){this.src=this.dataset.f;this.dataset.f=''}else{this.style.display='none'}">` : '';
  const precio = l.promo ? `<em>${esc(clp(l.promo.precio))}</em>` : '';
  return L.divIcon({
    className: '', iconSize: [0, 0],
    html: `<div class="jm-pin ${sel ? 'sel' : ''}"><span class="jm-g">${esc(l.glifo)}${img}</span>${precio}</div>`,
  });
};

/** Lee qué zona muestra el mapa: centro, radio que la cubre y límites visibles. */
function leerVista(map) {
  const c = map.getCenter(), b = map.getBounds();
  const radio = Math.min(20000, Math.max(200, Math.ceil(c.distanceTo(b.getNorthEast()) / 50) * 50));
  const r5 = (n) => Math.round(n * 1e5) / 1e5;
  return { lat: r5(c.lat), lng: r5(c.lng), radio, n: b.getNorth(), s: b.getSouth(), e: b.getEast(), o: b.getWest() };
}

export default function MapaScreen({ ubic, onAbrir }) {
  const [filtro, setFiltro] = useState('near');
  const [vista, setVista] = useState(null);
  const [sel, setSel] = useState(null);
  const ses = useSesion();
  const [abiertoSug, setAbiertoSug] = useState(false);
  const [sug, setSug] = useState({ nombre: '', categoria: 'Comida rápida', direccion: '', operador: 'Ambos' });
  const [sugMsg, setSugMsg] = useState('');
  async function enviarSugerencia() {
    setSugMsg('');
    try {
      await api.sugerirLocal(sug);
      setSug({ nombre: '', categoria: 'Comida rápida', direccion: '', operador: 'Ambos' });
      setSugMsg('¡Gracias! Local notificado para verificación.');
      setTimeout(() => { setAbiertoSug(false); setSugMsg(''); }, 1600);
    } catch (e) { setSugMsg(e.message); }
  }
  const divRef = useRef(null), mapRef = useRef(null), capaRef = useRef(null), yoRef = useRef(null);
  const deselRef = useRef(null), timer = useRef(null);
  deselRef.current = () => setSel(null);

  const opciones = FILTROS.find((f) => f[0] === filtro)[2];
  const esperando = ubic.estado === 'pidiendo';

  // El mapa manda: cada vez que se mueve o se acerca se piden los locales de la zona visible.
  const q = useAsync(
    () => (esperando || !vista
      ? new Promise(() => {})
      : api.locales({ ...opciones, radio: vista.radio, lat: vista.lat, lng: vista.lng }).then((d) => ({ ...d, vista }))),
    [filtro, vista?.lat, vista?.lng, vista?.radio, esperando],
  );

  // Locales dentro de lo que se ve, con la distancia medida desde el usuario (no desde el centro del mapa)
  const v = q.data?.vista;
  const locales = (q.data?.locales ?? [])
    .filter((l) => !v || (l.lat <= v.n && l.lat >= v.s && l.lng <= v.e && l.lng >= v.o))
    .map((l) => ({ ...l, distancia_m: distanciaM(ubic.lat, ubic.lng, l.lat, l.lng) }));
  locales.sort(opciones.orden === 'calificacion'
    ? (a, b) => b.calificacion - a.calificacion || a.distancia_m - b.distancia_m
    : (a, b) => a.distancia_m - b.distancia_m || b.calificacion - a.calificacion);
  const elegido = locales.find((l) => l.id === sel);
  const truncado = (q.data?.total ?? 0) >= 300;

  // Crea el mapa una sola vez
  useEffect(() => {
    const map = L.map(divRef.current, { zoomControl: false, minZoom: ZOOM_MIN, attributionControl: false }).setView([ubic.lat, ubic.lng], ZOOM_INICIAL);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    L.control.attribution({ position: 'bottomleft', prefix: false })
      .addAttribution('© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>').addTo(map);
    const ajustarZoom = () => map.getContainer().classList.toggle('lejos', map.getZoom() < ZOOM_PRECIOS);
    ajustarZoom();
    map.on('zoomend', ajustarZoom);
    map.on('click', () => deselRef.current());
    map.on('moveend', () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setVista(leerVista(map)), 350);
    });
    capaRef.current = L.layerGroup().addTo(map);
    yoRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setTimeout(() => { map.invalidateSize(); setVista(leerVista(map)); }, 100);
    return () => { clearTimeout(timer.current); map.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recentra solo cuando cambia tu ubicación (GPS o campus); mover el mapa a mano no lo devuelve aquí
  useEffect(() => { mapRef.current?.setView([ubic.lat, ubic.lng], ZOOM_INICIAL); }, [ubic.lat, ubic.lng]);

  // Tu posición: punto azul con halo
  useEffect(() => {
    yoRef.current.clearLayers();
    L.marker([ubic.lat, ubic.lng], {
      interactive: false, keyboard: false, zIndexOffset: -500,
      icon: L.divIcon({ className: '', iconSize: [0, 0], html: '<div class="jm-yo"><i></i><b></b></div>' }),
    }).addTo(yoRef.current);
  }, [ubic.lat, ubic.lng]);

  // Pines de los locales de la zona
  useEffect(() => {
    const capa = capaRef.current;
    capa.clearLayers();
    locales.forEach((l) => {
      L.marker([l.lat, l.lng], { icon: iconoPin(l, l.id === sel), zIndexOffset: l.id === sel ? 1000 : 0 })
        .on('click', (e) => { L.DomEvent.stopPropagation(e); setSel(l.id); })
        .addTo(capa);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data, sel, ubic.lat, ubic.lng, filtro]);

  const origen = ubic.origen === 'gps' ? 'Usando tu ubicación' : 'Usando el campus de referencia';
  const irAMi = () => mapRef.current?.setView([ubic.lat, ubic.lng], ZOOM_INICIAL);
  const cargando = esperando || !vista || (q.loading && !q.data);

  return (
    <section className="screen active anim">
      <div className="mapwrap" onClick={(e) => { if (!e.target.closest('.jm-pin')) setSel(null); }}>
        <div ref={divRef} className="mapcanvas" />

        <div className="glass">
          <div><small>{saludo()}</small><h2>¿Dónde <em>almuerzas</em> hoy?</h2></div>
          <div className="radius"><b>{cargando ? '…' : locales.length}</b>{locales.length === 1 ? 'local' : 'locales'}</div>
        </div>

        <button className="recenter" onClick={irAMi} aria-label="Ir a mi ubicación">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2" /><path d="M12 2.5v3.3M12 18.2v3.3M2.5 12h3.3M18.2 12h3.3" /></svg>
        </button>

        <div className={`peek ${elegido ? 'show' : ''}`}>
          {elegido && (<>
            <Tile l={elegido} />
            <div className="t"><b>{elegido.nombre}</b><span>{elegido.categoria} · {fmt(elegido.distancia_m)}{elegido.n_resenas ? <> · <span className="star">★</span> {elegido.calificacion}</> : ''}</span></div>
            <button className="go" onClick={() => onAbrir(elegido.id)}>Ver</button>
          </>)}
        </div>
      </div>

      <div className="lift">
        <div className="grab" />
        <div className="chips">
          {FILTROS.map(([k, t]) => <button key={k} className={`chip ${filtro === k ? 'on' : ''}`} onClick={() => { setFiltro(k); setSel(null); }}>{t}</button>)}
          <button className={`chip ${abiertoSug ? 'on' : ''}`} onClick={() => setAbiertoSug((v) => !v)}>+ Notificar local</button>
        </div>

        {abiertoSug && (
          <div className="rform" style={{ marginBottom: 12 }}>
            <b style={{ fontSize: 14 }}>Notificar local que acepta BAES</b>
            {!ses ? (
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Inicia sesión en la pestaña Ingresar para notificar un local.</span>
            ) : (<>
              <input placeholder="Nombre del local" value={sug.nombre} onChange={(e) => setSug({ ...sug, nombre: e.target.value })} />
              <input placeholder="Dirección (ej. Av. Providencia 1234)" value={sug.direccion} onChange={(e) => setSug({ ...sug, direccion: e.target.value })} />
              <select value={sug.operador} onChange={(e) => setSug({ ...sug, operador: e.target.value })}>
                <option value="Ambos">Acepta Pluxee y Edenred</option>
                <option value="Pluxee">Solo Pluxee</option>
                <option value="Edenred">Solo Edenred</option>
              </select>
              {sugMsg && <span className="msg">{sugMsg}</span>}
              <button className="btn teal" onClick={enviarSugerencia}>Enviar notificación</button>
            </>)}
          </div>
        )}
        <div className="loc-line">
          {esperando ? 'Buscando tu ubicación…' : origen}
          {ubic.origen !== 'gps' && !esperando && <> · <a href="#" onClick={(e) => { e.preventDefault(); ubic.pedir(); }}>Usar mi ubicación</a></>}
        </div>
        <div className="sect"><h3>Cerca de <em>ti</em></h3><span>{q.data ? `${locales.length} locales en esta zona` : ''}</span></div>
        <Estado q={{ ...q, loading: cargando }} esVacio={q.data && locales.length === 0} vacio="No hay locales con convenio en esta parte del mapa. Muévelo o aléjalo para ver más.">
          <div>
            {locales.slice(0, MAX_LISTA).map((l, i) => (
              <button key={l.id} className={`card rise ${l.id === sel ? 'sel' : ''}`} style={{ '--i': Math.min(i + 1, 6) }} onClick={() => onAbrir(l.id)}>
                <Tile l={l} />
                <div className="info"><b>{l.nombre}</b>
                  <div className="meta">{l.categoria} · {fmt(l.distancia_m)}</div>
                  <div className="meta">{l.n_resenas ? <><span className="star">★</span> {l.calificacion} ({l.n_resenas} {l.n_resenas === 1 ? 'reseña' : 'reseñas'})</> : 'Sin reseñas aún'}</div>
                  {l.promo && <span className="badge"><i />Promo: {l.promo.titulo}</span>}
                </div>
              </button>
            ))}
            {locales.length > MAX_LISTA && <p className="more">Y {locales.length - MAX_LISTA} más en el mapa. Acércalo para verlos aquí.</p>}
            {truncado && <p className="more">Hay muchos locales: se muestran los más cercanos al centro. Acerca el mapa para ver el resto.</p>}
          </div>
        </Estado>
      </div>
    </section>
  );
}
