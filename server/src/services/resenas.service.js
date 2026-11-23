import { AppError } from '../middleware/errors.js';

/** "Camila Reyes Soto" -> "Camila R." */
export const nombreCorto = (nombre) => {
  const [a, b] = nombre.trim().split(/\s+/);
  return b ? `${a} ${b[0].toUpperCase()}.` : a;
};

export function crearResenasService({ resenasRepo, localesRepo, estudiantesRepo }) {
  const exigirLocal = async (id) => {
    if (!(await localesRepo.porId(id))) throw new AppError(404, 'No encontramos ese local.');
  };
  return {
    async listar(localId) {
      await exigirLocal(localId);
      return resenasRepo.listarPorLocal(localId);
    },
    async crear(localId, estudianteId, datos) {
      await exigirLocal(localId);
      const e = await estudiantesRepo.porId(estudianteId);
      if (!e) throw new AppError(401, 'Tu sesión ya no es válida. Inicia sesión de nuevo.');
      return resenasRepo.crear(localId, { ...datos, estudianteId, autor: nombreCorto(e.nombre), carrera: e.carrera });
    },
    // Solo la autora o el autor puede editar o borrar su reseña (las demás responden 404, como si no existieran).
    async actualizar(id, estudianteId, datos) {
      const r = await resenasRepo.actualizar(id, estudianteId, datos);
      if (!r) throw new AppError(404, 'No encontramos esa reseña.');
      return r;
    },
    async eliminar(id, estudianteId) {
      if (!(await resenasRepo.eliminar(id, estudianteId))) throw new AppError(404, 'No encontramos esa reseña.');
    },
  };
}
