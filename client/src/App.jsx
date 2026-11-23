import { useState } from 'react';
import { api } from './api.js';
import { useAsync } from './util.jsx';
import { useUbicacion } from './ubicacion.js';
import { useSesion, sesion } from './sesion.js';
import AuthScreen from './screens/AuthScreen.jsx';
import MapaScreen from './screens/MapaScreen.jsx';
import DetalleScreen from './screens/DetalleScreen.jsx';
import PromosScreen from './screens/PromosScreen.jsx';
import PerfilScreen from './screens/PerfilScreen.jsx';
import PedidoSheet from './components/PedidoSheet.jsx';

const Icono = {
  map: <svg viewBox="0 0 24 24"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>,
  promos: <svg viewBox="0 0 24 24"><path d="M20 12l-8 8-9-9V3h8z" /><circle cx="7.5" cy="7.5" r="1.3" /></svg>,
  profile: <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></svg>,
};

export default function App() {
  const [pantalla, setPantalla] = useState('map');
  const [localId, setLocalId] = useState(null);
  const [pedido, setPedido] = useState(null); // { id, titulo, precio, localNombre }
  const [aviso, setAviso] = useState('');
  const [version, setVersion] = useState(0); // sube al crear un pedido para recargar el perfil
  const [motivo, setMotivo] = useState(''); // por qué se pidió iniciar sesión
  const [retorno, setRetorno] = useState(null); // pantalla a la que volver después de ingresar
  const ubic = useUbicacion();
  const s = useSesion();
  const favs = useAsync(() => (s ? api.favoritos() : Promise.resolve([])), [s?.estudiante.id]);
  const favIds = new Set((favs.data ?? []).map((f) => f.id));

  const avisar = (msg) => { setAviso(msg); setTimeout(() => setAviso(''), 1900); };
  const abrirLocal = (id) => { setLocalId(id); setPantalla('detail'); };
  const ir = (p) => setPantalla(p);

  // Mapa, locales y promos se ven sin cuenta; favoritos, pedidos, reseñas y perfil piden iniciar sesión.
  const pedirLogin = (m) => { setMotivo(m); setRetorno(pantalla === 'profile' ? null : pantalla); setPedido(null); setPantalla('profile'); };
  const alIngresar = (msg) => { avisar(msg); setMotivo(''); if (retorno) { setPantalla(retorno); setRetorno(null); } setVersion((v) => v + 1); };
  const salir = () => { sesion.cerrar(); setPedido(null); setPantalla('map'); avisar('Sesión cerrada'); };

  async function alternarFavorito(id) {
    if (!s) return pedirLogin('Inicia sesión para guardar tus locales favoritos.');
    try {
      if (favIds.has(id)) { await api.quitarFavorito(id); avisar('Quitado de favoritos'); }
      else { await api.agregarFavorito(id); avisar('Guardado en favoritos'); }
      favs.recargar();
    } catch (e) { avisar(e.message); }
  }

  const pedirPedido = (p) => (s ? setPedido(p) : pedirLogin('Inicia sesión para pedir con promo.'));

  const tab = pantalla === 'detail' ? 'map' : pantalla;
  return (
    <div className="stage">
      <main className="phone">
        <div className="viewport">

          {pantalla === 'map' && <MapaScreen ubic={ubic} onAbrir={abrirLocal} />}
          {pantalla === 'detail' && (
            <DetalleScreen id={localId} esFavorito={favIds.has(localId)} onVolver={() => ir('map')}
              onFavorito={() => alternarFavorito(localId)} onPedir={pedirPedido} onAviso={avisar}
              onLogin={() => pedirLogin('Inicia sesión para dejar tu reseña.')} />
          )}
          {pantalla === 'promos' && <PromosScreen ubic={ubic} onPedir={pedirPedido} />}
          {pantalla === 'profile' && (s
            ? <PerfilScreen version={version} onAbrir={abrirLocal} onAviso={avisar} onFavoritosCambian={favs.recargar} onSalir={salir} />
            : <AuthScreen motivo={motivo} onListo={alIngresar} />)}

          <nav className="tabbar">
            {[['map', 'Mapa'], ['promos', 'Promos'], ['profile', 'Perfil']].map(([k, t]) => (
              <button key={k} className={`tab ${tab === k ? 'on' : ''}`} onClick={() => ir(k)}>{Icono[k]}{k === 'profile' && !s ? 'Ingresar' : t}</button>
            ))}
          </nav>

          {pedido && (
            <PedidoSheet pedido={pedido} onCerrar={() => setPedido(null)}
              onCreado={() => setVersion((v) => v + 1)} onVerPedidos={() => { setPedido(null); ir('profile'); }} />
          )}
          <div className={`toast ${aviso ? 'show' : ''}`}>{aviso}</div>
        </div>
      </main>
    </div>
  );
}
