import { AppError } from '../middleware/errors.js';

export function crearSugerenciasService({ sugerenciasRepo, estudiantesRepo }) {
  return {
    /** Una sugerencia queda "pendiente": no aparece en el mapa hasta que alguien la revise. */
    async crear(estudianteId, datos) {
      if (!(await estudiantesRepo.porId(estudianteId))) {
        throw new AppError(401, 'Tu sesión ya no es válida. Inicia sesión de nuevo.');
      }
      return sugerenciasRepo.crear({ ...datos, estudianteId });
    },
    listar() {
      return sugerenciasRepo.listar();
    },
  };
}
