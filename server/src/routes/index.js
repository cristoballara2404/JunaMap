import { Router } from 'express';
import { asyncH } from '../middleware/errors.js';
import { soloPropio } from '../middleware/sesion.js';
import { limitar } from '../middleware/limite.js';

export function crearRutas({ locales, resenas, pedidos, estudiantes, auth, sesion, admin }) {
  const r = Router();
  const limiteLogin = limitar({ ventanaMs: 15 * 60_000, max: 10, clave: (req) => `${req.ip}|${String(req.body?.correo ?? '').toLowerCase()}` });
  const limiteRegistro = limitar({ ventanaMs: 60 * 60_000, max: 10, clave: (req) => req.ip });

  r.get('/salud', (_req, res) => res.json({ estado: 'ok' }));

  // Cuenta
  r.post('/auth/registro', limiteRegistro, asyncH(auth.registro));
  r.post('/auth/login', limiteLogin, asyncH(auth.login));
  r.get('/auth/yo', sesion, asyncH(auth.yo));

  // Locales: lectura pública
  r.get('/locales', asyncH(locales.listar));
  r.post('/locales', admin, asyncH(locales.crear));
  r.get('/locales/:id', asyncH(locales.obtener));
  r.put('/locales/:id', admin, asyncH(locales.actualizar));
  r.delete('/locales/:id', admin, asyncH(locales.eliminar));

  // Reseñas: leer es público; publicar, editar y borrar exige sesión (y ser la autora o el autor)
  r.get('/locales/:id/resenas', asyncH(resenas.listar));
  r.post('/locales/:id/resenas', sesion, asyncH(resenas.crear));
  r.put('/resenas/:id', sesion, asyncH(resenas.actualizar));
  r.delete('/resenas/:id', sesion, asyncH(resenas.eliminar));

  // Pedidos: siempre los del estudiante con sesión
  r.get('/pedidos', sesion, asyncH(pedidos.listar));
  r.post('/pedidos', sesion, asyncH(pedidos.crear));
  r.patch('/pedidos/:id', sesion, asyncH(pedidos.cambiarEstado));
  r.delete('/pedidos/:id', sesion, asyncH(pedidos.eliminar));

  // Estudiante: solo el propio
  r.use('/estudiantes/:id', sesion, soloPropio);
  r.get('/estudiantes/:id', asyncH(estudiantes.obtener));
  r.patch('/estudiantes/:id', asyncH(estudiantes.cambiarOperador));
  r.delete('/estudiantes/:id', asyncH(estudiantes.eliminarCuenta));
  r.get('/estudiantes/:id/favoritos', asyncH(estudiantes.favoritos));
  r.put('/estudiantes/:id/favoritos/:localId', asyncH(estudiantes.agregarFavorito));
  r.delete('/estudiantes/:id/favoritos/:localId', asyncH(estudiantes.quitarFavorito));
  return r;
}
