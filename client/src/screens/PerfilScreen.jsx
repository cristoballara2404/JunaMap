import { api } from '../api.js';
import { Estado, Tile, clp, useAsync } from '../util.jsx';

const ETIQUETA = { por_retirar: 'Por retirar', retirado: 'Retirado', cancelado: 'Cancelado' };

export default function PerfilScreen({ version, onAbrir, onAviso, onFavoritosCambian, onSalir }) {
  const est = useAsync(api.estudiante, [version]);
  const favs = useAsync(api.favoritos, [version]);
  const ped = useAsync(api.pedidos, [version]);

  async function eliminarCuenta() {
    if (!window.confirm('Se borrarán tu cuenta, tus pedidos, favoritos y reseñas. Esta acción no se puede deshacer. ¿Continuar?')) return;
    try { await api.eliminarCuenta(); onSalir(); } catch (e) { onAviso(e.message); }
  }

  async function operador(o) {
    try { await api.cambiarOperador(o); est.recargar(); } catch (e) { onAviso(e.message); }
  }
  async function cambiar(id, estado) {
    try { await api.cambiarEstadoPedido(id, estado); onAviso('Pedido actualizado'); ped.recargar(); est.recargar(); }
    catch (e) { onAviso(e.message); }
  }
  async function anular(id) {
    try { await api.anularPedido(id); onAviso('Pedido anulado'); ped.recargar(); est.recargar(); }
    catch (e) { onAviso(e.message); }
  }
  const e = est.data;
  return (
    <section className="screen active anim">
      <Estado q={est}>
        {e && (<>
          <div className="cred rise" style={{ '--i': 1 }}>
            <div className="cr-top"><span className="tagc">Estudiante BAES</span><span className="lg">JunaMap</span></div>
            <h2>{e.nombre}</h2><div className="car">{e.carrera}</div>
            <div className="op"><small>El operador de tu beca</small>
              <div className="seg">{['Pluxee', 'Edenred'].map((o) => <button key={o} className={e.operador === o ? 'on' : ''} onClick={() => operador(o)}>{o}</button>)}</div>
              <p>{e.operador} opera en {e.operador === 'Pluxee' ? 'la Región Metropolitana' : 'las regiones'}. JunaMap muestra los mismos locales con cualquiera de los dos.</p></div>
          </div>
          <div className="stats rise" style={{ '--i': 2 }}>
            <div><b>{e.n_pedidos}</b><span>pedidos en JunaMap</span></div>
            <div><b>{e.n_favoritos}</b><span>locales favoritos</span></div>
          </div>
        </>)}
      </Estado>
      <div className="sect rise" style={{ '--i': 3 }}><h3>Tus <em>favoritos</em></h3></div>
      <Estado q={favs} esVacio={favs.data && favs.data.length === 0} vacio="Aún no tienes favoritos. Toca el corazón en un local.">
        {(favs.data ?? []).map((l) => (
          <button key={l.id} className="card rise" style={{ '--i': 3 }} onClick={() => { onFavoritosCambian(); onAbrir(l.id); }}>
            <Tile l={l} cls="sm" /><div className="info"><b>{l.nombre}</b><div className="meta">{l.categoria}</div></div>
          </button>
        ))}
      </Estado>
      <div className="sect rise" style={{ '--i': 4 }}><h3>Mis <em>pedidos</em></h3></div>
      <Estado q={ped} esVacio={ped.data && ped.data.length === 0} vacio="Todavía no has pedido ninguna promo.">
        <div className="hrow rise" style={{ '--i': 5 }}>
          {(ped.data ?? []).map((o) => (
            <div key={o.id} style={{ display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div><b style={{ fontSize: 14 }}>{o.local_nombre} · {o.codigo}</b><small>{new Date(o.creado_en).toLocaleDateString('es-CL')}</small></div>
                <div style={{ textAlign: 'right' }}><span className="amt">{clp(o.valor_promo)}</span><span className={`pill ${o.estado === 'retirado' ? 'ok' : ''}`}>{ETIQUETA[o.estado]}</span></div>
              </div>
              {o.estado === 'por_retirar' && (
                <div className="acts">
                  <button className="mini sec" onClick={() => cambiar(o.id, 'retirado')}>Ya lo retiré</button>
                  <button className="mini dng" onClick={() => anular(o.id)}>Anular</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Estado>
      <p className="hint">Solo aparecen los pedidos hechos a través de JunaMap.</p>
      <div className="cta">
        <button className="btn ghost" onClick={onSalir}>Cerrar sesión</button>
        <button className="mini dng" style={{ marginTop: 10, width: '100%' }} onClick={eliminarCuenta}>Eliminar mi cuenta</button>
      </div>
    </section>
  );
}
