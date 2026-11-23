import { AppError } from './errors.js';

/** Límite simple en memoria: máx. `max` peticiones por `clave` cada `ventanaMs` (frena fuerza bruta). */
export function limitar({ ventanaMs, max, clave }) {
  const golpes = new Map();
  return (req, _res, next) => {
    const ahora = Date.now(), k = clave(req);
    const recientes = (golpes.get(k) ?? []).filter((t) => ahora - t < ventanaMs);
    if (recientes.length >= max) return next(new AppError(429, 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'));
    recientes.push(ahora);
    golpes.set(k, recientes);
    if (golpes.size > 5000) for (const [key, v] of golpes) if (!v.some((t) => ahora - t < ventanaMs)) golpes.delete(key);
    next();
  };
}
