import { entero, opcion } from '../middleware/validators.js';

// Todas las rutas de pedidos exigen sesión: el estudiante sale del token (req.estudianteId), nunca del cuerpo.
export function crearPedidosController(servicio) {
  return {
    async listar(req, res) { res.json(await servicio.listar(req.estudianteId)); },
    async crear(req, res) {
      const pedido = await servicio.crear({ estudianteId: req.estudianteId, promoId: entero(req.body?.promo_id, 'promo_id') });
      res.status(201).json(pedido);
    },
    async cambiarEstado(req, res) {
      const estado = opcion(req.body?.estado, 'estado', ['retirado', 'cancelado']);
      res.json(await servicio.cambiarEstado(entero(req.params.id, 'id'), estado, req.estudianteId));
    },
    async eliminar(req, res) {
      await servicio.eliminar(entero(req.params.id, 'id'), req.estudianteId);
      res.status(204).end();
    },
  };
}
