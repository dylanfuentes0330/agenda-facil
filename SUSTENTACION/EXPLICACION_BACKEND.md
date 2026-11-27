# Backend — explicación para la sustentación

## Arquitectura en capas (`backend/src`)
| Capa | Archivos | Rol |
|---|---|---|
| Arranque | `server.js`, `app.js` | Crea Express, aplica helmet, CORS, `express.json` (100 KB), rate limiting y monta las rutas; apagado ordenado |
| Configuración | `config/env.js` | Lee y valida variables de entorno; en producción exige un `JWT_SECRET` robusto |
| Middleware | `middleware/auth.js`, `validate.js`, `error.js` | Autenticación JWT, autorización por rol, validación Zod, errores centralizados |
| Rutas (controladores) | `routes/auth.js`, `public.js`, `client.js`, `business/*.js` | Reciben la petición, llaman a servicios/Prisma y responden JSON |
| Servicios (lógica de negocio) | `services/availability.js`, `services/reservations.js` | Cálculo de franjas y creación/modificación/cancelación de reservas con transacciones |
| Utilidades | `lib/time.js`, `storage.js`, `plans.js`, `serialize.js`, `slug.js`, `errors.js` | Fechas, S3/local, límites de plan, formato de respuestas |
| Datos | `prisma/schema.prisma`, migraciones, seeds | Modelo relacional y versiones del esquema |

En Express los “controladores” son las funciones de cada ruta; la lógica crítica está separada en `services/` para
poder probarla y reutilizarla (por ejemplo, el negocio y el cliente crean reservas con la misma función).

## Endpoints principales (prefijo `/api`)
- **Públicos**: `GET /health`, `GET /public/plans`, `GET /public/businesses`, `GET /public/businesses/:slug`, `GET /public/businesses/:slug/availability`.
- **Autenticación**: `POST /auth/register/business`, `POST /auth/register/client`, `POST /auth/login`, `GET|PUT /auth/me`, `PUT /auth/password`.
- **Cliente** (rol CLIENT): `POST /client/reservations`, `GET /client/reservations`, `PATCH /client/reservations/:id/cancel`.
- **Negocio** (rol BUSINESS_ADMIN): perfil, configuración, plan, logo, horarios, CRUD de servicios, clientes (con historial) y reservas, disponibilidad y `GET /business/dashboard`.

## Autenticación y autorización
1. **Registro**: la contraseña se guarda con **bcrypt** (12 rondas en producción). El negocio se crea en la misma
   transacción que el usuario, con su plan, fecha de fin de prueba (14 días) y un horario inicial.
2. **Login**: se compara la contraseña con bcrypt; si el correo no existe se compara contra un hash ficticio para no
   revelar qué correos están registrados. Se responde un **JWT** firmado (emisor, audiencia, expiración de 8 h).
3. **Cada petición**: `authenticate` verifica el JWT y **recarga el usuario desde la base de datos** (si se elimina la
   cuenta, el token deja de servir). `requireRole` permite solo el rol adecuado (401 sin sesión, 403 sin permiso).
4. **Rate limiting**: 20 intentos cada 15 minutos por IP en `/api/auth/*`.

## Aislamiento multi-tenant
El `businessId` **nunca** viene del cliente: se obtiene del usuario autenticado y todas las consultas filtran por él
(`where: { id, businessId }`). Si un negocio pide un recurso de otro, la respuesta es **404** (ni siquiera se confirma
que exista). Seis pruebas automatizadas lo verifican.

## Reglas de reserva (`services/reservations.js`)
Dentro de una transacción `READ COMMITTED`:
1. `SELECT id FROM businesses WHERE id = ? FOR UPDATE` → bloquea la fila del negocio (las reservas simultáneas del mismo negocio se atienden una a la vez).
2. Valida: servicio activo, día abierto, dentro del horario, no en el pasado, máximo 90 días adelante, y para clientes que la hora coincida con las franjas.
3. Comprueba solapamiento: existe otra reserva activa con `inicio < fin_nuevo` y `fin > inicio_nuevo` → **409 SLOT_TAKEN**.
4. Para clientes, máximo **5 reservas futuras confirmadas** por negocio (anti-abuso).
5. Inserta la reserva guardando el precio del servicio en ese momento.

Cancelación del cliente: solo si faltan al menos *N* horas (configurado por el negocio). Estados: `CONFIRMED`,
`COMPLETED`, `CANCELLED`, `NO_SHOW`, con transiciones controladas.

## Base de datos
Siete tablas: `plans`, `users`, `businesses`, `services`, `business_hours`, `clients`, `reservations`.
- Un **usuario** administra como máximo **un negocio** (`owner_id` único).
- Un **negocio** tiene muchos **servicios**, **clientes**, **reservas** y 7 filas de **horario**.
- Una **reserva** une negocio + servicio + cliente.
- Un **cliente** es una ficha *por negocio* (la misma persona puede ser cliente de varios negocios con fichas separadas); si tiene cuenta, se enlaza con `user_id`.
- Restricciones: correo único, `slug` único, servicio único por nombre y negocio, horario único por día y negocio; índices por `(business_id, start_at)`.
- Migraciones con Prisma (`prisma migrate deploy` en CI y producción); los planes se cargan con un seed idempotente.

## Manejo de errores
Formato único `{ "error": { "code", "message", "details" } }`: 400 validación/JSON inválido, 401, 403, 404, 409
(duplicado o horario ocupado), 413 (petición grande), 422 (regla de negocio), 429 (rate limit), 500 (genérico, sin detalles internos).
