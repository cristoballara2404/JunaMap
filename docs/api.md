Base: `/api/v1` · Formato: JSON · Autenticación: `Authorization: Bearer <token>` (se obtiene en `/auth/login` o `/auth/registro`; dura 7 días).

| Verbo | Ruta | Parámetros / cuerpo | Éxito | Errores |
|---|---|---|---|---|
| GET | `/salud` | — | 200 | — |
| POST | `/auth/registro` | `nombre`, `carrera`, `operador` (`Pluxee`\|`Edenred`), `correo`, `clave` (8–72), `acepta` (`true`: aviso de privacidad) | 201 + `{ token, estudiante }` | 400, 409, 429 |
| POST | `/auth/login` | `correo`, `clave` | 200 + `{ token, estudiante }` | 400, 401, 429 |
| GET | `/auth/yo` 🔒 | — | 200 | 401 |
| GET | `/locales` | query: `lat`*, `lng`*, `radio` (50–20000 m, def. 400; máx. 300 locales, los más cercanos al punto), `orden` (`cercania`\|`calificacion`), `solo_menu` | 200 | 400 |
| GET | `/locales/:id` | — | 200 | 400, 404 |
| POST | `/locales` 🛡️ | local completo (+ `menu[]`, `promo` opcionales) | 201 + `Location` | 400, 403, 422 |
| PUT | `/locales/:id` 🛡️ | local completo (reemplaza) | 200 | 400, 403, 404, 422 |
| DELETE | `/locales/:id` 🛡️ | — | 204 | 400, 403, 404 |
| GET | `/locales/:id/resenas` | — | 200 | 400, 404 |
| POST | `/locales/:id/resenas` 🔒 | `estrellas` (1–5), `comentario` (5–300); autor y carrera salen de la cuenta | 201 | 400, 401, 404 |
| PUT | `/resenas/:id` 🔒 | igual que POST (solo la autora o el autor) | 200 | 400, 401, 404 |
| DELETE | `/resenas/:id` 🔒 | — (solo la autora o el autor) | 204 | 400, 401, 404 |
| GET | `/pedidos` 🔒 | — (los del estudiante con sesión) | 200 | 401 |
| POST | `/pedidos` 🔒 | `promo_id` | 201 | 400, 401, 404, 422, 503 |
| PATCH | `/pedidos/:id` 🔒 | `estado`: `retirado`\|`cancelado` | 200 | 400, 401, 404, 409 |
| DELETE | `/pedidos/:id` 🔒 | — (solo si está `por_retirar`) | 204 | 400, 401, 404, 409 |
| GET | `/estudiantes/:id` 🔒 | — | 200 | 400, 404 |
| PATCH | `/estudiantes/:id` 🔒 | `operador`: `Pluxee`\|`Edenred` | 200 | 400, 404 |
| DELETE | `/estudiantes/:id` 🔒 | — (borra la cuenta, sus reseñas, pedidos y favoritos) | 204 | 400, 403, 404 |
| GET | `/estudiantes/:id/favoritos` 🔒 | — | 200 | 400, 404 |
| PUT | `/estudiantes/:id/favoritos/:localId` 🔒 | — (idempotente) | 204 | 400, 404 |
| DELETE | `/estudiantes/:id/favoritos/:localId` 🔒 | — (idempotente) | 204 | 400, 404 |
| POST | `/sugerencias` | sesión; `nombre`* (2–80), `direccion`* (5–120), `categoria` (2–60), `operador` (`Pluxee`\|`Edenred`\|`Ambos`), `lat` y `lng` (juntas) | 201 + sugerencia (`estado: pendiente`) | 400, 401, 429 |
| GET | `/sugerencias` | cabecera `x-admin-key` | 200 + lista | 403 |

**Códigos de estado.** 200 lectura o actualización correcta · 201 recurso creado · 204 correcto sin cuerpo · 401 falta iniciar sesión o la sesión venció (o correo/contraseña incorrectos) · 403 intentar usar datos de otra persona · 429 demasiados intentos de ingreso (10 por 15 min) · 400 formato inválido (número fuera de rango, texto vacío, JSON roto) · 404 el recurso no existe · 409 conflicto de estado (por ejemplo, cancelar un pedido ya retirado) · 422 la petición es válida pero viola una regla de negocio (local sin convenio vigente, promo más cara que el precio original) · 503 no se pudo generar un código de retiro único tras varios intentos · 500 error inesperado (sin detalles técnicos en la respuesta).

🔒 = exige sesión. 🛡️ = exige la cabecera `x-admin-key` con el valor de `ADMIN_KEY` del servidor; si esa variable no está definida, estas operaciones quedan desactivadas (403). Las rutas `/estudiantes/:id…` solo aceptan el `id` propio (si no, 403). Lectura de locales y reseñas es pública. Los pedidos y reseñas ajenos responden 404.

**Formato de error.** Todas las fallas responden `{ "error": { "mensaje": "..." } }` con un mensaje en lenguaje de usuario.

**Versionado.** La versión va en la ruta (`/api/v1`). Los cambios compatibles (campos nuevos) se agregan a v1; un cambio que rompa el contrato se publica como `/api/v2` y v1 se mantiene hasta migrar el cliente.

**Ejemplo: crear un pedido.**

```
POST /api/v1/pedidos        Authorization: Bearer <token>
{ "promo_id": 1 }

201 Created
{ "id": 4, "codigo": "JM-5750", "local_nombre": "Fuente de Soda Doña Rosa",
  "promo_titulo": "Menú del día + postre", "valor_promo": 3500, "costo_servicio": 250,
  "estado": "por_retirar", "pagas_ahora_en_la_app": 250, "pagas_en_el_local": 3500 }
```

**Ejemplo: error de negocio.**

```
PATCH /api/v1/pedidos/1   { "estado": "cancelado" }   (el pedido ya estaba retirado)

409 Conflict
{ "error": { "mensaje": "Un pedido \"retirado\" no puede pasar a \"cancelado\"." } }
```
