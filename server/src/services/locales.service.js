import { AppError } from '../middleware/errors.js';
import { logoDeCadena } from './logos.js';

export function crearLocalesService({ localesRepo, config }) {
  const validarPromo = (promo) => {
    if (promo && promo.precio >= promo.precio_original) {
      throw new AppError(422, 'El precio de la promo debe ser menor que el precio original.');
    }
  };

  return {
    /** Locales con convenio vigente dentro del radio, ordenados por cercanía (o calificación). */
    async listarCerca({ lat, lng, radio, orden = 'cercania', soloMenu = false }) {
      const radioUsado = radio ?? config.radioDefecto;
      const filas = await localesRepo.buscarCerca({ lat, lng, radio: radioUsado, soloVigentes: true, limite: config.limiteLocales ?? 300 });
      const locales = filas
        .filter((l) => !soloMenu || l.tiene_menu_dia)
        .map((l) => ({ ...l, ...logoDeCadena(l.nombre), distancia_m: Math.round(l.distancia_m) }));
      const porCercania = (a, b) => a.distancia_m - b.distancia_m || b.calificacion - a.calificacion;
      const porNota = (a, b) => b.calificacion - a.calificacion || a.distancia_m - b.distancia_m;
      locales.sort(orden === 'calificacion' ? porNota : porCercania);
      return { radio_m: radioUsado, total: locales.length, locales };
    },

    async obtener(id) {
      const local = await localesRepo.porId(id);
      if (!local) throw new AppError(404, 'No encontramos ese local.');
      return { ...local, ...logoDeCadena(local.nombre) };
    },

    async crear(datos) {
      validarPromo(datos.promo);
      const id = await localesRepo.crear(datos);
      return localesRepo.porId(id);
    },

    async actualizar(id, datos) {
      validarPromo(datos.promo);
      const ok = await localesRepo.actualizar(id, datos);
      if (!ok) throw new AppError(404, 'No encontramos ese local.');
      return localesRepo.porId(id);
    },

    async eliminar(id) {
      if (!(await localesRepo.eliminar(id))) throw new AppError(404, 'No encontramos ese local.');
    },
  };
}
