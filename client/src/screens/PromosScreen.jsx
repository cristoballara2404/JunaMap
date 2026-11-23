import { api } from '../api.js';
import { Estado, clp, useAsync } from '../util.jsx';

export default function PromosScreen({ ubic, onPedir }) {
  const q = useAsync(() => api.locales({ radio: 5000, lat: ubic.lat, lng: ubic.lng }), [ubic.lat, ubic.lng]);
  const conPromo = (q.data?.locales ?? []).filter((l) => l.promo);
  return (
    <section className="screen active anim">
      <div className="title rise"><h2>Promos <em>BAES</em></h2><p>Pide desde la app, retira en el local y paga la promo con tu tarjeta BAES.</p></div>
      <Estado q={q} esVacio={q.data && conPromo.length === 0} vacio="Hoy no hay promos disponibles. Vuelve más tarde.">
        <div>
          {conPromo.map((l, i) => (
            <div key={l.id} className="tk rise" style={{ '--i': i + 1 }}>
              <div className="l" style={{ background: `linear-gradient(160deg,${l.color_a},${l.color_b})` }}><small>DESDE</small><b>{clp(l.promo.precio)}</b></div>
              <div className="r">
                <div className="t"><b>{l.promo.titulo}</b><span>{l.nombre}</span><br /><em>Ahorras {clp(l.promo.precio_original - l.promo.precio)}</em></div>
                <button className="mini" onClick={() => onPedir({ id: l.promo.id, titulo: l.promo.titulo, precio: l.promo.precio, localNombre: l.nombre })}>Pedir</button>
              </div>
            </div>
          ))}
        </div>
      </Estado>
    </section>
  );
}
