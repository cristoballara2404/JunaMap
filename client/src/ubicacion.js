import { useEffect, useState } from 'react';
import { CAMPUS } from './api.js';

/** Pide la ubicación al navegador (con permiso). Si se niega o falla, usa el campus de referencia. */
export function useUbicacion() {
  const [u, setU] = useState({ ...CAMPUS, origen: 'campus', estado: 'pidiendo' });

  const pedir = () => {
    if (!navigator.geolocation) return setU({ ...CAMPUS, origen: 'campus', estado: 'no-disponible' });
    setU((x) => ({ ...x, estado: 'pidiendo' }));
    navigator.geolocation.getCurrentPosition(
      (p) => setU({ lat: p.coords.latitude, lng: p.coords.longitude, origen: 'gps', estado: 'ok' }),
      (e) => setU({ ...CAMPUS, origen: 'campus', estado: e.code === 1 ? 'denegada' : 'error' }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };
  const usarCampus = () => setU({ ...CAMPUS, origen: 'campus', estado: 'campus' });

  useEffect(pedir, []);
  return { ...u, pedir, usarCampus };
}
