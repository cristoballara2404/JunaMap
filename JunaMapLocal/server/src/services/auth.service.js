import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { AppError } from '../middleware/errors.js';
import { firmar } from './tokens.js';

const scrypt = promisify(scryptCb);
const LARGO = 64;

export async function hashClave(clave) {
  const sal = randomBytes(16);
  const hash = await scrypt(clave, sal, LARGO);
  return `scrypt$${sal.toString('base64')}$${hash.toString('base64')}`;
}

export async function claveCorrecta(clave, guardado) {
  const [alg, sal, hash] = String(guardado ?? '').split('$');
  if (alg !== 'scrypt' || !sal || !hash) return false;
  const esperado = Buffer.from(hash, 'base64');
  const calculado = await scrypt(clave, Buffer.from(sal, 'base64'), esperado.length);
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado);
}

const MENSAJE_INVALIDO = 'Correo o contraseña incorrectos.';

export function crearAuthService({ estudiantesRepo, config }) {
  // Hash falso para gastar el mismo tiempo cuando el correo no existe (evita adivinar qué correos están registrados).
  const falso = hashClave('no-existe-' + randomBytes(8).toString('hex'));
  const emitir = (e) => ({
    token: firmar({ sub: String(e.id) }, config.jwtSecret, config.sesionDias * 86400),
    estudiante: { id: e.id, nombre: e.nombre, carrera: e.carrera, operador: e.operador },
  });

  return {
    async registrar({ nombre, carrera, operador, correo, clave }) {
      const id = await estudiantesRepo.crearCuenta({ nombre, carrera, operador, correo, claveHash: await hashClave(clave) });
      if (!id) throw new AppError(409, 'Ya existe una cuenta con ese correo. Prueba iniciando sesión.');
      return emitir(await estudiantesRepo.porId(id));
    },

    async ingresar({ correo, clave }) {
      const e = await estudiantesRepo.porCorreo(correo);
      const ok = await claveCorrecta(clave, e?.clave_hash ?? (await falso));
      if (!e || !ok) throw new AppError(401, MENSAJE_INVALIDO);
      return emitir(e);
    },

    async perfil(id) {
      const e = await estudiantesRepo.porId(id);
      if (!e) throw new AppError(401, 'Tu sesión ya no es válida. Inicia sesión de nuevo.');
      return { id: e.id, nombre: e.nombre, carrera: e.carrera, operador: e.operador };
    },
  };
}
