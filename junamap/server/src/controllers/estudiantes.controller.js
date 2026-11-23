import { entero, opcion } from '../middleware/validators.js';

export function crearEstudiantesController(servicio) {
  return {
    async obtener(req, res) { res.json(await servicio.obtener(entero(req.params.id, 'id'))); },
    async cambiarOperador(req, res) {
      const operador = opcion(req.body?.operador, 'operador', ['Pluxee', 'Edenred']);
      res.json(await servicio.cambiarOperador(entero(req.params.id, 'id'), operador));
    },
    async eliminarCuenta(req, res) {
      await servicio.eliminarCuenta(entero(req.params.id, 'id'));
      res.status(204).end();
    },
    async favoritos(req, res) { res.json(await servicio.favoritos(entero(req.params.id, 'id'))); },
    async agregarFavorito(req, res) {
      await servicio.agregarFavorito(entero(req.params.id, 'id'), entero(req.params.localId, 'localId'));
      res.status(204).end();
    },
    async quitarFavorito(req, res) {
      await servicio.quitarFavorito(entero(req.params.id, 'id'), entero(req.params.localId, 'localId'));
      res.status(204).end();
    },
  };
}
