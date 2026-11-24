# JunaMap

**Tu beca, tu mapa, tu próxima comida.**

> Para el estudiante becado por Junaeb que no sabe dónde usar su saldo cerca de donde está, JunaMap le muestra en un mapa único los locales con convenio, ordenados por cercanía y calificados por otros estudiantes.

Proyecto semestral · INGT1003 Arquitectura de Desarrollo (Móvil y Web) · Universidad Mayor · Docente: Carlos Muñoz S.

## Integrantes

| Integrante | Usuario de GitHub |
|---|---|
| Lara, Cristóbal | [@cristoballara2404](https://github.com/cristoballara2404) |
| Oliva, Benjamín | bnj-92 |

## Enlaces

- Video promocional: no se entrega en esta revisión (guion en [`docs/guion-video.md`](docs/guion-video.md)).
- Documentos (PDF): [Hito 2 · Documento técnico](docs/Hito2_Documento_Tecnico.pdf) y [Hito 3 · Documentación final](docs/Hito3_Documentacion_Final.pdf)
- Manual de uso e instalación: [`docs/manual.md`](docs/manual.md) · Tabla de la API: [`docs/api.md`](docs/api.md)

## Arquitectura

Cliente React (SPA) → API REST Node.js/Express en tres capas (rutas y controladores, servicios, repositorios) → PostgreSQL + PostGIS. Monolito modular.

```
junamap/
├── client/    React + Vite (pantallas, api.js, estados de carga/vacío/error)
├── server/    Express: routes → controllers → services → repositories
│   └── test/  pruebas de la capa de negocio (node:test)
├── db/        schema.sql (modelo) y seed.sql (datos ficticios)
└── docs/      documentos, diagramas y colección de peticiones
```

## Cómo levantarlo (resumen)

```bash
cp .env.example .env && docker compose up -d          # base de datos con datos de ejemplo
cd server && cp .env.example .env && npm install && npm start      # API en :3000
cd client && npm install && npm run dev                            # app en :5173
```

Detalle, datos de prueba y solución de fallas: [`docs/manual.md`](docs/manual.md).

## Limitaciones declaradas

- Inicio de sesión con correo y contraseña (hash scrypt, sesión por token firmado de 7 días guardado en el navegador). No hay recuperación de contraseña ni verificación del correo. La administración de locales (`POST/PUT/DELETE /locales`) exige la cabecera `x-admin-key` con el valor de `ADMIN_KEY` (si no se configura, queda desactivada). Cada persona puede eliminar su cuenta desde el perfil.
- El mapa pide la ubicación al navegador; si se niega, usa un punto de referencia del campus.
- Los locales vienen de un listado del equipo y de cadenas citadas en prensa: que una cadena tenga convenio no garantiza que cada sucursal lo tenga, así que JunaMap pide confirmarlo en la app del operador. Los precios, promos y reseñas de demostración son ficticios. JunaMap no muestra ni cobra el saldo de la beca.
- Las sugerencias de locales quedan pendientes de revisión (`GET /sugerencias` con la clave de administrador); aún no hay pantalla para aprobarlas.
