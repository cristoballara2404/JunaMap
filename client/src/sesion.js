import { useSyncExternalStore } from 'react';

// La sesión (token + datos básicos) se guarda en localStorage para que siga abierta al recargar.
const CLAVE = 'junamap_sesion';
const oyentes = new Set();
const leer = () => { try { return JSON.parse(localStorage.getItem(CLAVE)) ?? null; } catch { return null; } };
let actual = leer();

export const sesion = {
  get: () => actual,
  token: () => actual?.token ?? null,
  id: () => actual?.estudiante?.id ?? null,
  guardar(datos) {
    actual = datos;
    try { localStorage.setItem(CLAVE, JSON.stringify(datos)); } catch { /* modo privado: queda solo en memoria */ }
    oyentes.forEach((f) => f());
  },
  cerrar() {
    actual = null;
    try { localStorage.removeItem(CLAVE); } catch { /* nada que borrar */ }
    oyentes.forEach((f) => f());
  },
  suscribir(f) { oyentes.add(f); return () => oyentes.delete(f); },
};

/** Devuelve la sesión actual (o null) y re-dibuja la app cuando cambia. */
export const useSesion = () => useSyncExternalStore(sesion.suscribir, sesion.get);
