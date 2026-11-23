import { createHash, timingSafeEqual } from 'node:crypto';
import { AppError } from './errors.js';

const huella = (s) => createHash('sha256').update(String(s)).digest(); // mismo largo siempre: comparación en tiempo constante

/** Protege la administración de locales con la cabecera "x-admin-key". Sin ADMIN_KEY configurada, queda desactivada. */
export function crearExigirAdmin(claveAdmin) {
  return (req, _res, next) => {
    if (!claveAdmin) return next(new AppError(403, 'La administración de locales está desactivada en este servidor.'));
    const dada = req.headers['x-admin-key'];
    if (typeof dada !== 'string' || !timingSafeEqual(huella(dada), huella(claveAdmin))) {
      return next(new AppError(403, 'No tienes permiso para administrar locales.'));
    }
    next();
  };
}
