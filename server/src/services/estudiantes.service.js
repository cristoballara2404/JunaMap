import { AppError } from '../middleware/errors.js';

export function crearEstudiantesService({ estudiantesRepo, localesRepo }) {
  const existe = async (id) => {
    const e = await estudiantesRepo.porId(id);
    if (!e) throw new AppError(404, 'No encontramos al estudiante.');
    return e;
  };
  return {
    obtener: existe,
    async cambiarOperador(id, operador) {
      await existe(id);
      await estudiantesRepo.actualizarOperador(id, operador);
      return estudiantesRepo.porId(id);
    },
    async eliminarCuenta(id) {
      await existe(id);
      if (!(await estudiantesRepo.eliminarCuenta(id))) throw new AppError(404, 'No encontramos al estudiante.');
    },
    async favoritos(id) {
      await existe(id);
      return estudiantesRepo.listarFavoritos(id);
    },
    async agregarFavorito(id, localId) {
      await existe(id);
      if (!(await localesRepo.porId(localId))) throw new AppError(404, 'No encontramos ese local.');
      await estudiantesRepo.agregarFavorito(id, localId);
    },
    async quitarFavorito(id, localId) {
      await existe(id);
      await estudiantesRepo.quitarFavorito(id, localId); // idempotente
    },
  };
}
