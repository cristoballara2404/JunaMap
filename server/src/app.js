import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { manejarErrores, rutaNoEncontrada } from './middleware/errors.js';
import { crearRutas } from './routes/index.js';
import { localesRepo } from './repositories/locales.repo.js';
import { resenasRepo } from './repositories/resenas.repo.js';
import { pedidosRepo } from './repositories/pedidos.repo.js';
import { estudiantesRepo } from './repositories/estudiantes.repo.js';
import { sugerenciasRepo } from './repositories/sugerencias.repo.js';
import { crearLocalesService } from './services/locales.service.js';
import { crearResenasService } from './services/resenas.service.js';
import { crearPedidosService } from './services/pedidos.service.js';
import { crearAuthService } from './services/auth.service.js';
import { crearSugerenciasService } from './services/sugerencias.service.js';
import { crearExigirSesion } from './middleware/sesion.js';
import { crearExigirAdmin } from './middleware/admin.js';
import { crearAuthController } from './controllers/auth.controller.js';
import { crearEstudiantesService } from './services/estudiantes.service.js';
import { crearLocalesController } from './controllers/locales.controller.js';
import { crearResenasController } from './controllers/resenas.controller.js';
import { crearPedidosController } from './controllers/pedidos.controller.js';
import { crearEstudiantesController } from './controllers/estudiantes.controller.js';
import { crearSugerenciasController } from './controllers/sugerencias.controller.js';

// Raíz de composición: aquí (y solo aquí) se conectan las tres capas.
const servicios = {
  locales: crearLocalesService({ localesRepo, config }),
  resenas: crearResenasService({ resenasRepo, localesRepo, estudiantesRepo }),
  pedidos: crearPedidosService({ pedidosRepo, localesRepo, estudiantesRepo, config }),
  estudiantes: crearEstudiantesService({ estudiantesRepo, localesRepo }),
  auth: crearAuthService({ estudiantesRepo, config }),
  sugerencias: crearSugerenciasService({ sugerenciasRepo, estudiantesRepo }),
};

export const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '100kb' }));
app.use('/api/v1', crearRutas({
  locales: crearLocalesController(servicios.locales, config),
  resenas: crearResenasController(servicios.resenas),
  pedidos: crearPedidosController(servicios.pedidos),
  estudiantes: crearEstudiantesController(servicios.estudiantes),
  auth: crearAuthController(servicios.auth),
  sugerencias: crearSugerenciasController(servicios.sugerencias),
  sesion: crearExigirSesion(config.jwtSecret),
  admin: crearExigirAdmin(config.adminKey),
}));
app.use(rutaNoEncontrada);
app.use(manejarErrores);
