import { useState } from 'react';
import { api } from '../api.js';
import { Estado, Logo, clp, stars, useAsync } from '../util.jsx';
import { useSesion } from '../sesion.js';

function FormResena({ localId, onCreada, onAviso, onLogin }) {
  const ses = useSesion();
  const [estrellas, setEstrellas] = useState('5');
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    const texto = comentario.trim();
    if (texto.length < 5) return setError('Cuéntanos un poco más (mínimo 5 caracteres).'); // validación en cliente
    setError(''); setEnviando(true);
    try {
      // El nombre y la carrera de la reseña salen de tu cuenta (los pone el servidor).
      await api.crearResena(localId, { estrellas: Number(estrellas), comentario: texto });
      setComentario(''); onAviso('¡Gracias por tu reseña!'); onCreada();
    } catch (e) { setError(e.message); } // validación del servidor, en lenguaje de usuario
    finally { setEnviando(false); }
  }

  if (!ses) {
    return (
      <div className="rform">
        <b style={{ fontSize: 14 }}>Deja tu reseña</b>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>Inicia sesión para calificar este local.</span>
        <button className="btn teal" onClick={onLogin}>Iniciar sesión</button>
      </div>
    );
  }
  return (
    <div className="rform">
      <b style={{ fontSize: 14 }}>Deja tu reseña</b>
      <select value={estrellas} onChange={(e) => setEstrellas(e.target.value)} aria-label="Calificación">
        {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)} · {n} de 5</option>)}
      </select>
      <textarea value={comentario} maxLength={300} placeholder="¿Cómo te fue? ¿Aceptan la BAES sin problema?" onChange={(e) => setComentario(e.target.value)} />
      {error && <span className="msg">{error}</span>}
      <button className="btn teal" disabled={enviando} onClick={enviar}>{enviando ? 'Enviando…' : 'Publicar reseña'}</button>
    </div>
  );
}

export default function DetalleScreen({ id, esFavorito, onVolver, onFavorito, onPedir, onAviso, onLogin }) {
  const q = useAsync(() => api.local(id), [id]);
  const r = useAsync(() => api.resenas(id), [id]);
  const l = q.data;

  if (!l) {
    return (
      <section className="screen active anim">
        <div style={{ paddingTop: 70 }}><Estado q={q} /></div>
        <div className="cta"><button className="btn ghost" onClick={onVolver}>Volver al mapa</button></div>
      </section>
    );
  }
  return (
    <section className="screen active anim">
      <div className="hero" style={{ '--a': l.color_b, background: `linear-gradient(160deg,${l.color_a},${l.color_b})` }}>
        <div className="glyph">{l.glifo}</div><div className="awning" />
        {l.logo_url && <div className="hero-logo"><Logo l={l} /></div>}
      </div>
      <button className="fab l" onClick={onVolver} aria-label="Volver"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg></button>
      <button className={`fab r fav ${esFavorito ? 'on' : ''}`} onClick={onFavorito} aria-label="Favorito"><svg viewBox="0 0 24 24"><path d="M12 21s-8-5.3-8-11a4.7 4.7 0 0 1 8-3.3A4.7 4.7 0 0 1 20 10c0 5.7-8 11-8 11z" /></svg></button>
      <div className="sheetcard rise" style={{ '--i': 1 }}>
        <h2>{l.nombre}</h2>
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>{l.categoria} · {l.direccion}</div>
        {l.origen === 'osm'
          ? <span className="badge" style={{ background: '#FFF4D6', color: '#7A5B00' }}>Cadena citada en prensa con convenio · confirma la sucursal en tu app</span>
          : l.origen === 'oficial'
            ? <span className="badge"><i />Cadena con convenio Junaeb publicado · confirma en tu app</span>
            : <span className="badge"><i />Convenio BAES vigente</span>}
        <div className="row3">
          <div className="stat"><b>{l.n_resenas ? <><span className="star">★</span> {l.calificacion}</> : '—'}</b><span>{l.n_resenas ? `${l.n_resenas} reseñas` : 'Sin reseñas'}</span></div>
          <div className="stat"><b>Horario</b><span>{l.horario}</span></div>
        </div>
      </div>
      <h4 className="h4 rise" style={{ '--i': 2 }}>Menú del <em>día</em></h4>
      {l.menu.length === 0
        ? <div className="state">Este local aún no publicó su menú del día.</div>
        : <div className="menu rise" style={{ '--i': 3 }}>
            {l.menu.map((m) => <div key={m.id}><span>{m.nombre}</span><b>{clp(m.precio)}</b></div>)}
            {l.nota_menu && <small>{l.nota_menu}</small>}
          </div>}
      {l.promo && (
        <div className="coupon rise" style={{ '--i': 4 }}>
          <div className="cTop"><small>PROMO BAES</small><h4>{l.promo.titulo}</h4>
            <div className="pr"><b>{clp(l.promo.precio)}</b><s>{clp(l.promo.precio_original)}</s></div></div>
          <div className="cBot"><p>Ahorras {clp(l.promo.precio_original - l.promo.precio)} · retiras en el local</p>
            <button className="btn teal" onClick={() => onPedir({ id: l.promo.id, titulo: l.promo.titulo, precio: l.promo.precio, localNombre: l.nombre })}>Pedir con promo</button></div>
        </div>
      )}
      <h4 className="h4">Lo que dicen otros <em>estudiantes</em></h4>
      <Estado q={r} esVacio={r.data && r.data.length === 0} vacio="Aún no hay reseñas. ¡Sé el primero en contar cómo te fue!">
        {(r.data ?? []).map((x) => (
          <div key={x.id} className="review"><b>{x.autor}</b> <span>· {x.carrera}</span>
            <span className="star" style={{ float: 'right' }}>{stars(x.estrellas)}</span><br />{x.comentario}</div>
        ))}
      </Estado>
      <FormResena localId={id} onAviso={onAviso} onLogin={onLogin} onCreada={() => { r.recargar(); q.recargar(); }} />
      <div className="cta"><a className="btn ghost" target="_blank" rel="noreferrer"
        href={`https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}&travelmode=walking`}>Cómo llegar</a></div>
    </section>
  );
}
