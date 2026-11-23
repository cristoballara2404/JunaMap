import { numero, entero, opcion, validarLocal } from '../middleware/validators.js';

export function crearLocalesController(servicio, config) {
  return {
    async listar(req, res) {
      const q = req.query;
      res.json(await servicio.listarCerca({
        lat: numero(q.lat, 'lat', -90, 90),
        lng: numero(q.lng, 'lng', -180, 180),
        radio: q.radio === undefined ? undefined : numero(q.radio, 'radio', 50, config.radioMaximo),
        orden: q.orden === undefined ? 'cercania' : opcion(q.orden, 'orden', ['cercania', 'calificacion']),
        soloMenu: q.solo_menu === 'true',
      }));
    },
    async obtener(req, res) {
      res.json(await servicio.obtener(entero(req.params.id, 'id')));
    },
    async crear(req, res) {
      const local = await servicio.crear(validarLocal(req.body));
      res.status(201).location(`/api/v1/locales/${local.id}`).json(local);
    },
    async actualizar(req, res) {
      res.json(await servicio.actualizar(entero(req.params.id, 'id'), validarLocal(req.body)));
    },
    async eliminar(req, res) {
      await servicio.eliminar(entero(req.params.id, 'id'));
      res.status(204).end();
    },
  };
}
