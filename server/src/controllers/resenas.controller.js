import { entero, validarResenaSesion } from '../middleware/validators.js';

export function crearResenasController(servicio) {
  return {
    async listar(req, res) { res.json(await servicio.listar(entero(req.params.id, 'id'))); },
    async crear(req, res) {
      res.status(201).json(await servicio.crear(entero(req.params.id, 'id'), req.estudianteId, validarResenaSesion(req.body)));
    },
    async actualizar(req, res) {
      res.json(await servicio.actualizar(entero(req.params.id, 'id'), req.estudianteId, validarResenaSesion(req.body)));
    },
    async eliminar(req, res) {
      await servicio.eliminar(entero(req.params.id, 'id'), req.estudianteId);
      res.status(204).end();
    },
  };
}
