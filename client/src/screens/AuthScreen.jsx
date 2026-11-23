import { useState } from 'react';
import { api } from '../api.js';
import { sesion } from '../sesion.js';

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function AuthScreen({ motivo, onListo }) {
  const [modo, setModo] = useState('login'); // login | registro
  const [f, setF] = useState({ nombre: '', carrera: '', operador: 'Pluxee', correo: '', clave: '', acepta: false });
  const [ver, setVer] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const registro = modo === 'registro';
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  function validar() {
    if (registro && f.nombre.trim().length < 2) return 'Escribe tu nombre.';
    if (registro && f.carrera.trim().length < 2) return 'Escribe tu carrera.';
    if (!CORREO.test(f.correo.trim())) return 'Escribe un correo válido, por ejemplo nombre@correo.cl.';
    if (!f.clave) return 'Escribe tu contraseña.';
    if (registro && f.clave.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    if (registro && !f.acepta) return 'Para crear tu cuenta debes aceptar el aviso de privacidad.';
    return '';
  }

  async function enviar(e) {
    e.preventDefault();
    const problema = validar();
    if (problema) return setError(problema);
    setError(''); setEnviando(true);
    try {
      const datos = { ...f, nombre: f.nombre.trim(), carrera: f.carrera.trim(), correo: f.correo.trim() };
      const r = registro ? await api.registro(datos) : await api.login({ correo: datos.correo, clave: datos.clave });
      sesion.guardar(r);
      onListo(registro ? `¡Bienvenida/o, ${r.estudiante.nombre.split(' ')[0]}!` : `Hola de nuevo, ${r.estudiante.nombre.split(' ')[0]}`);
    } catch (err) { setError(err.message); }
    finally { setEnviando(false); }
  }

  return (
    <section className="screen active anim">
      <div className="title rise">
        <h2>{registro ? <>Crea tu <em>cuenta</em></> : <>Entra a <em>JunaMap</em></>}</h2>
        <p>{motivo || 'Guarda tus favoritos, pide con promo y deja reseñas con tu cuenta.'}</p>
      </div>

      <form className="auth rise" style={{ '--i': 1 }} onSubmit={enviar} noValidate>
        <div className="auth-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={!registro} className={!registro ? 'on' : ''} onClick={() => { setModo('login'); setError(''); }}>Ingresar</button>
          <button type="button" role="tab" aria-selected={registro} className={registro ? 'on' : ''} onClick={() => { setModo('registro'); setError(''); }}>Crear cuenta</button>
        </div>

        {registro && (<>
          <label>Nombre<input value={f.nombre} onChange={set('nombre')} maxLength={80} autoComplete="name" placeholder="Camila Reyes" /></label>
          <label>Carrera<input value={f.carrera} onChange={set('carrera')} maxLength={60} placeholder="Ingeniería Civil" /></label>
          <div className="auth-op"><span>Operador de tu beca</span>
            <div className="auth-seg">{['Pluxee', 'Edenred'].map((o) => (
              <button type="button" key={o} className={f.operador === o ? 'on' : ''} onClick={() => setF((x) => ({ ...x, operador: o }))}>{o}</button>
            ))}</div>
          </div>
        </>)}

        <label>Correo<input type="email" inputMode="email" value={f.correo} onChange={set('correo')} maxLength={120} autoComplete="email" placeholder="nombre@correo.cl" /></label>
        <label>Contraseña
          <span className="auth-pass">
            <input type={ver ? 'text' : 'password'} value={f.clave} onChange={set('clave')} maxLength={72}
              autoComplete={registro ? 'new-password' : 'current-password'} placeholder={registro ? 'Mínimo 8 caracteres' : 'Tu contraseña'} />
            <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{ver ? 'Ocultar' : 'Ver'}</button>
          </span>
        </label>

        {registro && (
          <label className="ck">
            <input type="checkbox" checked={f.acepta} onChange={(e) => setF((x) => ({ ...x, acepta: e.target.checked }))} />
            <span>Acepto que JunaMap guarde mi nombre, carrera, correo y operador para ofrecerme mi cuenta. No guarda mi contraseña en claro ni datos de mi tarjeta, y puedo eliminar mi cuenta cuando quiera desde mi perfil.</span>
          </label>
        )}

        {error && <span className="msg" role="alert">{error}</span>}
        <button className="btn teal" disabled={enviando}>{enviando ? 'Un momento…' : registro ? 'Crear cuenta' : 'Ingresar'}</button>
        <p className="auth-nota">
          {registro ? '¿Ya tienes cuenta? ' : '¿Primera vez aquí? '}
          <a href="#" onClick={(e) => { e.preventDefault(); setModo(registro ? 'login' : 'registro'); setError(''); }}>{registro ? 'Ingresa' : 'Crea tu cuenta'}</a>
        </p>
      </form>
      <p className="hint">Puedes explorar el mapa y los locales sin cuenta. JunaMap no pide ni guarda datos de tu tarjeta BAES.</p>
    </section>
  );
}
