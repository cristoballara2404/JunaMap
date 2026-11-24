## 1. Requisitos

- Node.js 20.6 o superior (incluye `npm`).
- PostgreSQL 15 o superior con la extensión PostGIS, o Docker para levantarla con un comando.
- Un navegador moderno.

## 2. Instalación paso a paso

1. Clonar el repositorio y entrar a la carpeta del proyecto.
2. **Base de datos con Docker:** `cp .env.example .env`, editar `POSTGRES_PASSWORD` y ejecutar `docker compose up -d`. Esto crea la base `junamap`, el esquema y los datos de ejemplo.
   **Sin Docker:** crear la base y cargar los scripts: `psql -d junamap -f db/schema.sql` y luego `psql -d junamap -f db/seed.sql`.
3. **Servidor:** `cd server`, `cp .env.example .env`, completar `DATABASE_URL` con la misma clave del paso 2 y `JWT_SECRET` (genera una con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`), `ADMIN_KEY` (clave para administrar locales; si la dejas vacía, esa función queda desactivada), `npm install` y `npm start`. Debe aparecer «JunaMap API escuchando en http://localhost:3000/api/v1».
4. **Cliente:** en otra terminal, `cd client`, `npm install` y `npm run dev`. Abrir http://localhost:5173.
5. **Pruebas automáticas del servidor (opcional):** `cd server && npm test`.

## 3. Datos de prueba

La base trae datos ficticios: 4 locales (Fuente de Soda Doña Rosa, La Esquina del Completo, Sushi Express Campus y Café Libreta), sus promos, menús y reseñas, y una estudiante de ejemplo (Camila Reyes) con 3 pedidos anteriores; esa cuenta del seed no tiene correo ni contraseña, así que no se puede ingresar con ella. Para probar, toca **Ingresar → Crear cuenta** y registra la tuya.

**Si ya tenías la base creada:** ejecuta `psql -d junamap -f db/migracion_login.sql` (inicio de sesión) y `psql -d junamap -f db/migracion_sugerencias.sql` (notificar locales) para agregarlos sin borrar datos.

## 4. Cómo usar el producto (flujo principal)

0. Mapa, locales y promos se ven sin cuenta. Al guardar un favorito, pedir con promo o reseñar, la app pide iniciar sesión o crear una cuenta.
1. En **Mapa**, tocar el pin «R» (o la tarjeta de Doña Rosa) y luego **Ver**.
2. Revisar el menú, las reseñas y, si se quiere, publicar una reseña propia.
3. Pulsar **Pedir con promo** y **Confirmar pedido**. La app muestra el código de retiro (por ejemplo, JM-5750).
4. Ir a **Perfil → Mis pedidos**: el pedido aparece «Por retirar». Se puede marcar «Ya lo retiré» o «Anular».
5. Recargar la página: el pedido y la reseña siguen ahí, porque viven en la base de datos.

## 5. Las tres fallas más frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| El servidor se cierra con «Falta DATABASE_URL» | No existe `server/.env` | Copiar `server/.env.example` como `.env` y completar los valores |
| `extension "postgis" is not available` al cargar `schema.sql` | PostgreSQL sin PostGIS | Usar Docker (`docker compose up -d`) o instalar el paquete PostGIS de tu sistema |
| El cliente muestra «No pudimos conectarnos con JunaMap» | El servidor no está corriendo o usa otro puerto | Iniciar `npm start` en `server/`; si el puerto no es 3000, ajustar `PORT` y el proxy de `client/vite.config.js` |

## 6. Mapa real y ubicación

El mapa usa OpenStreetMap (con Leaflet). Al abrir la app, el navegador pide permiso de ubicación; si lo aceptas, el radio parte desde donde estás, y si lo niegas se usa un punto de referencia del campus. El mapa necesita internet para cargar las teselas.

Los locales de la base son **ficticios** y están cerca del campus de referencia. Para verlos alrededor de tu ubicación real, edita `db/reubicar.sql` (tus coordenadas) y ejecútalo una vez:

```
Get-Content db\reubicar.sql | docker compose exec -T db psql -U junamap -d junamap
```

Después recarga la página. Si estás lejos de los locales, la app ofrece el botón «Ver la demo en el campus».

## 7. Locales reales (supermercados citados en prensa)

El importador trae sucursales **reales** de las cadenas que la prensa cita como adheridas a la tarjeta Junaeb (Jumbo, Unimarc, Santa Isabel, Mayorista 10, Alvi, Líder, Acuenta, Tottus y Erbi), con su ubicación en OpenStreetMap. Necesita internet.

1. Agrega las columnas nuevas a tu base (una sola vez), desde la carpeta `junamap`:
   ```
   Get-Content db\migracion_osm.sql | docker compose exec -T db psql -U junamap -d junamap
   ```
2. Importa las sucursales alrededor de tu ubicación (reemplaza las coordenadas por las tuyas):
   ```
   cd server
   node --env-file=.env scripts/importar-osm.js -33.45 -70.66 2000
   ```
   Debe decir cuántas sucursales encontró y cuántas guardó. Puedes repetirlo con otras coordenadas; no duplica.
3. Recarga la app. Esos locales aparecen en verde y su ficha dice «Cadena citada en prensa con convenio · confirma la sucursal en tu app».

**Importante:** que una cadena esté adherida no garantiza que cada sucursal acepte la beca. La app no lo afirma; el estudiante debe confirmarlo en el buscador oficial de Pluxee o Edenred.

## 8. Locales del listado del equipo (CSV)

Para cargar locales de comida con convenio publicado por el operador, un integrante los busca en el buscador oficial de Pluxee (https://www.pluxee.cl/merchant-finder/es-CL?pluxeeProducts=JUNAEB&merchantTypes=PHYSICAL_AND_ECOM%7CPHYSICAL) y los anota en `db/locales_verificados.csv`, una fila por local:

```
nombre,categoria,direccion,horario,lat,lng
```

Las coordenadas se obtienen con clic derecho sobre el lugar en Google Maps. Luego, desde `server/`:

```
node --env-file=.env scripts/importar-csv.js ..\db\locales_verificados.csv "Buscador de Pluxee, 23-11-2026"
```

Esos locales muestran «Cadena con convenio Junaeb publicado · confirma en tu app»: JunaMap no garantiza que cada sucursal acepte la tarjeta. Anota siempre la fecha de consulta: el convenio cambia con el tiempo.

## 9. Si «no aparece ningún local»

La app usa tu ubicación real, y los locales de demostración están cerca del campus de referencia, por lo que fuera de esa zona la lista queda vacía. Soluciones: pulsar **«Ver la demo en el campus»**, importar locales de tu zona (secciones 7 y 8) o mover los de demostración con `db/reubicar.sql` (sección 6).
