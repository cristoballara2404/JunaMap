// Tokens de sesión firmados (JWT HS256) con node:crypto: sin dependencias extra.
import { createHmac, timingSafeEqual } from 'node:crypto';

const b64 = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');
const firma = (datos, secreto) => createHmac('sha256', secreto).update(datos).digest('base64url');

export function firmar(payload, secreto, ttlSeg, ahora = Date.now()) {
  const iat = Math.floor(ahora / 1000);
  const cuerpo = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ ...payload, iat, exp: iat + ttlSeg })}`;
  return `${cuerpo}.${firma(cuerpo, secreto)}`;
}

/** Devuelve el payload si la firma es válida y no expiró; si no, null. */
export function verificar(token, secreto, ahora = Date.now()) {
  if (typeof token !== 'string') return null;
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  const esperado = Buffer.from(firma(`${partes[0]}.${partes[1]}`, secreto));
  const recibido = Buffer.from(partes[2]);
  if (esperado.length !== recibido.length || !timingSafeEqual(esperado, recibido)) return null;
  try {
    const header = JSON.parse(Buffer.from(partes[0], 'base64url').toString());
    if (header.alg !== 'HS256') return null;
    const payload = JSON.parse(Buffer.from(partes[1], 'base64url').toString());
    if (!payload.exp || payload.exp < Math.floor(ahora / 1000)) return null;
    return payload;
  } catch { return null; }
}
