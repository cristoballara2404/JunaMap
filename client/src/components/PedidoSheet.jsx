import { useState } from 'react';
import { api } from '../api.js';
import { clp } from '../util.jsx';

const SERVICIO_REFERENCIAL = 250; // el valor real lo devuelve el servidor al confirmar

export default function PedidoSheet({ pedido, onCerrar, onCreado, onVerPedidos }) {
  const [estado, setEstado] = useState('confirmar'); // confirmar | enviando | listo
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null);

  async function confirmar() {
    setEstado('enviando'); setError('');
    try {
      const r = await api.crearPedido(pedido.id);
      setResultado(r); setEstado('listo'); onCreado();
    } catch (e) { setError(e.message); setEstado('confirmar'); }
  }

  return (
    <div className="overlay show" onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className="sheet">
        <div className="grab" />
        {estado !== 'listo' ? (<>
          <h3>Confirma tu pedido</h3>
          <p className="sm">{pedido.localNombre} · retiro en ~15 minutos</p>
          <div className="line"><span>{pedido.titulo}</span><b>{clp(pedido.precio)}</b></div>
          <div className="line"><span>Costo de servicio JunaMap</span><b>{clp(SERVICIO_REFERENCIAL)}</b></div>
          <div className="line total"><span>Pagas ahora en la app</span><span>{clp(SERVICIO_REFERENCIAL)}</span></div>
          <div className="note">El valor de la promo ({clp(pedido.precio)}) lo pagas con tu tarjeta BAES al retirar en el local. En la app solo pagas el costo de servicio.</div>
          {error && <div className="state err" style={{ margin: '10px 0' }}>{error}</div>}
          <button className="btn teal" disabled={estado === 'enviando'} onClick={confirmar}>{estado === 'enviando' ? 'Confirmando…' : 'Confirmar pedido'}</button>
          <button className="btn ghost" onClick={onCerrar}>Cancelar</button>
        </>) : (<>
          <div className="ok">
            <div className="check"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></div>
            <h3>¡Pedido confirmado!</h3>
            <p className="sm">Muestra este código en {resultado.local_nombre}</p>
            <div className="code">{resultado.codigo}</div>
            <p className="sm">Retira en unos 15 minutos y paga {clp(resultado.pagas_en_el_local)} con tu tarjeta BAES.</p>
          </div>
          <button className="btn teal" onClick={onVerPedidos}>Ver mis pedidos</button>
        </>)}
      </div>
    </div>
  );
}
