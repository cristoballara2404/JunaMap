import { randomBytes } from 'node:crypto';

export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL,
  costoServicio: Number(process.env.COSTO_SERVICIO ?? 250),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  radioDefecto: 400,
  radioMaximo: 20000,
  jwtSecret: process.env.JWT_SECRET || randomBytes(32).toString('hex'), // sin JWT_SECRET, las sesiones se pierden al reiniciar
  adminKey: process.env.ADMIN_KEY || '', // sin ADMIN_KEY, crear/editar/borrar locales queda desactivado
  sesionDias: Number(process.env.SESION_DIAS ?? 7),
  limiteLocales: 300, // máximo de locales por consulta (los más cercanos al centro)
};
