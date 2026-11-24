import { validarSugerencia } from '../middleware/validators.js';

export function crearSugerenciasController(servicio) {
  return {
    async crear(req, res) { res.status(201).json(await servicio.crear(req.estudianteId, validarSugerencia(req.body))); },
    async listar(_req, res) { res.json(await servicio.listar()); },
  };
}
