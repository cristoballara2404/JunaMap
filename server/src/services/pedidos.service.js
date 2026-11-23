import { AppError } from '../middleware/errors.js';

export const TRANSICIONES = {
  por_retirar: ['retirado', 'cancelado'],
  retirado: [],
  cancelado: [],
};

const generarCodigo = () => `JM-${Math.floor(1000 + Math.random() * 9000)}`;

export function crearPedidosService({ pedidosRepo, localesRepo, estudiantesRepo, config, generar = generarCodigo }) {
  const exigirEstudiante = async (id) => {
    if (!(await estudiantesRepo.porId(id))) throw new AppError(404, 'No encontramos al estudiante.');
  };
  return {
    async listar(estudianteId) {
      await exigirEstudiante(estudianteId);
      return pedidosRepo.listarPorEstudiante(estudianteId);
    },

    /** En la app solo se cobra el costo de servicio; la promo se paga en el local con la tarjeta BAES. */
    async crear({ estudianteId, promoId }) {
      await exigirEstudiante(estudianteId);
      const promo = await localesRepo.promoPorId(promoId);
      if (!promo) throw new AppError(404, 'Esa promo ya no está disponible.');
      if (!promo.convenio_vigente) {
        throw new AppError(422, 'Este local no tiene convenio BAES vigente, así que no se puede pedir.');
      }
      for (let intento = 0; intento < 5; intento++) {
        const pedido = await pedidosRepo.crear({
          estudianteId,
          promoId: promo.id,
          localNombre: promo.local_nombre,
          promoTitulo: promo.titulo,
          codigo: generar(),
          valorPromo: promo.precio,
          costoServicio: config.costoServicio,
        });
        if (pedido) return { ...pedido, pagas_ahora_en_la_app: config.costoServicio, pagas_en_el_local: promo.precio };
      }
      throw new AppError(503, 'No pudimos generar tu código de retiro. Intenta otra vez.');
    },

    async cambiarEstado(id, nuevo, estudianteId) {
      const pedido = await pedidosRepo.porId(id);
      if (!pedido || pedido.estudiante_id !== estudianteId) throw new AppError(404, 'No encontramos ese pedido.');
      if (!TRANSICIONES[pedido.estado].includes(nuevo)) {
        throw new AppError(409, `Un pedido "${pedido.estado}" no puede pasar a "${nuevo}".`);
      }
      return pedidosRepo.actualizarEstado(id, nuevo);
    },

    async eliminar(id, estudianteId) {
      const pedido = await pedidosRepo.porId(id);
      if (!pedido || pedido.estudiante_id !== estudianteId) throw new AppError(404, 'No encontramos ese pedido.');
      if (pedido.estado !== 'por_retirar') throw new AppError(409, 'Solo se pueden anular pedidos que aún no se retiran.');
      await pedidosRepo.eliminar(id);
    },
  };
}
