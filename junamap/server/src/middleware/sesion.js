import { AppError } from './errors.js';
import { verificar } from '../services/tokens.js';

/** Exige "Authorization: Bearer <token>" y deja el id del estudiante en req.estudianteId. */
export function crearExigirSesion(secreto) {
  return (req, _res, next) => {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
    const payload = m && verificar(m[1], secreto);
    const id = Number(payload?.sub);
    if (!payload || !Number.isInteger(id)) return next(new AppError(401, 'Inicia sesión para continuar.'));
    req.estudianteId = id;
    next();
  };
}

/** Para rutas /estudiantes/:id: cada quien solo puede ver y editar lo suyo. */
export function soloPropio(req, _res, next) {
  if (Number(req.params.id) !== req.estudianteId) return next(new AppError(403, 'No puedes acceder a los datos de otra persona.'));
  next();
}
