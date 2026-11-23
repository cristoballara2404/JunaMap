import { validarLogin, validarRegistro } from '../middleware/validators.js';

export function crearAuthController(servicio) {
  return {
    async registro(req, res) { res.status(201).json(await servicio.registrar(validarRegistro(req.body))); },
    async login(req, res) { res.json(await servicio.ingresar(validarLogin(req.body))); },
    async yo(req, res) { res.json(await servicio.perfil(req.estudianteId)); },
  };
}
