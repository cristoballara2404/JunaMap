import { app } from './app.js';
import { config } from './config/index.js';

if (!config.databaseUrl) {
  console.error('Falta DATABASE_URL. Copia .env.example como .env y completa los valores.');
  process.exit(1);
}
if (!process.env.JWT_SECRET) console.warn('Aviso: define JWT_SECRET en .env; mientras tanto las sesiones se cierran al reiniciar el servidor.');
app.listen(config.port, () => console.log(`JunaMap API escuchando en http://localhost:${config.port}/api/v1`));
