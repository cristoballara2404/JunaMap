import { sesion } from './sesion.js';

const BASE = import.meta.env.VITE_API_URL ?? '/api/v1';

// Punto de referencia del campus (el mismo del seed de la base de datos).
export const CAMPUS = { lat: -33.423, lng: -70.643 };

async function pedir(ruta, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(BASE + ruta, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(sesion.token() ? { Authorization: `Bearer ${sesion.token()}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('No pudimos conectarnos con JunaMap. Revisa tu conexión e intenta de nuevo.');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (res.status === 401 && sesion.token() && !ruta.startsWith('/auth/')) { // el token venció o ya no vale
    sesion.cerrar();
    throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');
  }
  if (!res.ok) throw new Error(data?.error?.mensaje ?? 'Algo salió mal. Intenta de nuevo.');
  return data;
}

export const api = {
  sugerirLocal: (body) => pedir('/sugerencias', { method: 'POST', body }),
  registro: (datos) => pedir('/auth/registro', { method: 'POST', body: datos }),
  login: (datos) => pedir('/auth/login', { method: 'POST', body: datos }),
  locales: ({ lat = CAMPUS.lat, lng = CAMPUS.lng, orden = 'cercania', soloMenu = false, radio = 400 } = {}) =>
    pedir(`/locales?lat=${lat}&lng=${lng}&radio=${radio}&orden=${orden}&solo_menu=${soloMenu}`),
  local: (id) => pedir(`/locales/${id}`),
  resenas: (id) => pedir(`/locales/${id}/resenas`),
  crearResena: (id, body) => pedir(`/locales/${id}/resenas`, { method: 'POST', body }),
  estudiante: () => pedir(`/estudiantes/${sesion.id()}`),
  cambiarOperador: (operador) => pedir(`/estudiantes/${sesion.id()}`, { method: 'PATCH', body: { operador } }),
  favoritos: () => pedir(`/estudiantes/${sesion.id()}/favoritos`),
  eliminarCuenta: () => pedir(`/estudiantes/${sesion.id()}`, { method: 'DELETE' }),
  agregarFavorito: (id) => pedir(`/estudiantes/${sesion.id()}/favoritos/${id}`, { method: 'PUT' }),
  quitarFavorito: (id) => pedir(`/estudiantes/${sesion.id()}/favoritos/${id}`, { method: 'DELETE' }),
  pedidos: () => pedir('/pedidos'),
  crearPedido: (promoId) => pedir('/pedidos', { method: 'POST', body: { promo_id: promoId } }),
  cambiarEstadoPedido: (id, estado) => pedir(`/pedidos/${id}`, { method: 'PATCH', body: { estado } }),
  anularPedido: (id) => pedir(`/pedidos/${id}`, { method: 'DELETE' }),
};
