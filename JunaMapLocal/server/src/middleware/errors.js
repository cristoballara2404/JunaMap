export class AppError extends Error {
  constructor(status, mensaje, detalles) {
    super(mensaje);
    this.status = status;
    this.detalles = detalles;
  }
}

export const asyncH = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function rutaNoEncontrada(req, res) {
  res.status(404).json({ error: { mensaje: `Ruta no encontrada: ${req.method} ${req.originalUrl}` } });
}

// eslint-disable-next-line no-unused-vars
export function manejarErrores(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { mensaje: err.message, detalles: err.detalles } });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { mensaje: 'El cuerpo de la petición no es un JSON válido.' } });
  }
  console.error(err); // el detalle técnico queda en el log, no en la respuesta
  res.status(500).json({ error: { mensaje: 'Ocurrió un error inesperado. Intenta de nuevo en un momento.' } });
}
