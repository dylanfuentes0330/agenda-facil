# Agenda Fácil

**Plataforma SaaS de gestión de citas y reservas en la nube para pequeños y medianos negocios**: barberías, peluquerías, salones de belleza, consultorios, estudios de tatuajes y centros de estética.

[![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/ci.yml)
<!-- Reemplazar OWNER/REPO por el usuario/organización y el nombre del repositorio en GitHub -->

> Proyecto universitario. Estado actual: aplicación funcional y probada en entorno local; infraestructura AWS
> preparada (CloudFormation + scripts + CI/CD) y **pendiente de desplegar** desde la cuenta AWS Academy del equipo.
> Ver [Estado del proyecto](#estado-del-proyecto).

---

## Tabla de contenido

1. [Problema que resuelve](#problema-que-resuelve)
2. [Características](#características)
3. [Tecnologías](#tecnologías)
4. [Arquitectura](#arquitectura)
5. [Estructura de carpetas](#estructura-de-carpetas)
6. [Requisitos previos](#requisitos-previos)
7. [Instalación y ejecución local](#instalación-y-ejecución-local)
8. [Variables de entorno](#variables-de-entorno)
9. [Base de datos y migraciones](#base-de-datos-y-migraciones)
10. [Pruebas](#pruebas)
11. [API REST](#api-rest)
12. [CI/CD con GitHub Actions](#cicd-con-github-actions)
13. [Despliegue en AWS Academy](#despliegue-en-aws-academy)
14. [Dominio personalizado](#dominio-personalizado)
15. [Capturas de pantalla](#capturas-de-pantalla)
16. [Seguridad](#seguridad)
17. [Integrantes](#integrantes)
18. [Estado del proyecto](#estado-del-proyecto)
19. [Licencia](#licencia)

---

## Problema que resuelve

Muchos negocios que trabajan con citas las gestionan por WhatsApp, llamadas o cuaderno. Eso provoca:

- **Reservas duplicadas** (dos clientes a la misma hora) y citas olvidadas.
- **Saturación de mensajes**: el personal pierde tiempo confirmando horarios.
- **Pérdida de información** de clientes y de su historial.

Agenda Fácil centraliza la agenda: el negocio configura servicios y horarios, y sus clientes consultan la
disponibilidad y reservan en línea. El sistema **impide reservas incompatibles**, incluso cuando llegan al mismo tiempo.

## Características

### Para el negocio (rol `BUSINESS_ADMIN`)

| Funcionalidad | Dónde |
|---|---|
| Crear y administrar cuenta y perfil del negocio (datos, logo, preferencias) | `/registro`, `/panel/configuracion` |
| Registrar servicios con precio y duración; editar, activar/desactivar y eliminar | `/panel/servicios` |
| Configurar días y horas de atención | `/panel/horarios` |
| Crear, modificar (reprogramar), cancelar y cambiar el estado de citas; filtrar por fecha, estado y texto | `/panel/citas` |
| Panel con citas del día, próximas reservas y estadísticas básicas (avanzadas en Plan Profesional) | `/panel` |
| Administrar clientes (registrar, buscar, editar, eliminar sin historial) | `/panel/clientes` |
| Consultar historial completo de reservas por cliente | `/panel/clientes/:id` |
| Planes Básico / Profesional con límites reales y periodo de prueba (sin cobros) | `/panel/configuracion` |

### Para los clientes (rol `CLIENT`)

| Funcionalidad | Dónde |
|---|---|
| Buscar negocios y consultar sus servicios | `/reservar` |
| Ver horarios libres en tiempo real y reservar | `/reservar/:slug` |
| Consultar sus reservas (próximas e historial) | `/mis-reservas` |
| Cancelar dentro del margen configurado por el negocio | `/mis-reservas` |
| Administrar su información personal y contraseña | `/cuenta` |

### Reglas de negocio implementadas en el backend

- No se permiten reservas que se **solapen** con otra activa del mismo negocio (control transaccional con `SELECT … FOR UPDATE`).
- No se permiten reservas en el pasado, en días cerrados, fuera del horario ni a más de 90 días.
- Las reservas en línea deben coincidir con las franjas del negocio (intervalo configurable de 10–60 min).
- El cliente solo puede cancelar hasta *N* horas antes (configurable por el negocio, 0–168 h).
- Anti-abuso: un cliente puede tener como máximo **5 reservas futuras confirmadas** en un mismo negocio (el negocio no tiene ese tope al agendar).
- **Aislamiento multi-tenant**: el negocio se obtiene siempre del usuario autenticado; un negocio nunca puede leer ni modificar datos de otro.
- Límites por plan: Básico (10 servicios, 300 clientes), Profesional (ilimitado + estadísticas de rendimiento).

## Tecnologías

| Capa | Tecnología | Motivo |
|---|---|---|
| Frontend | **React 19 + Vite 6**, React Router 7, CSS propio con tokens de diseño, lucide-react | SPA rápida, build estático ideal para S3 + CloudFront |
| Backend | **Node.js 22 + Express 4** (JavaScript, ES Modules) | Simple de desplegar en EC2; ecosistema maduro |
| Validación | Zod | Esquemas declarativos con mensajes en español |
| ORM / BD | **Prisma 6 + MySQL 8** (Amazon RDS for MySQL) | Migraciones versionadas, consultas parametrizadas |
| Autenticación | JWT (jsonwebtoken) + bcrypt (bcryptjs, 12 rondas) | Sin estado, compatible con CloudFront |
| Seguridad HTTP | helmet, CORS con lista blanca, express-rate-limit | Cabeceras seguras y protección de fuerza bruta |
| Archivos | AWS SDK v3 (S3) con URLs prefirmadas | Bucket privado |
| Pruebas | Vitest, Supertest, Testing Library, Playwright, Newman | Unitarias, API con MySQL real, componentes, E2E |
| Infraestructura | AWS CloudFormation, EC2, RDS, S3, CloudFront, Route 53, IAM, Nginx, systemd | Arquitectura de la propuesta original |
| CI/CD | GitHub Actions | Lint, pruebas, build, E2E y despliegue |

## Arquitectura

![Arquitectura AWS](docs/diagramas/01-arquitectura-aws.png)

- **CloudFront** es la única puerta de entrada HTTPS: sirve el frontend desde un bucket **S3 privado** (Origin Access Control)
  y enruta `/api/*` hacia **EC2** (Nginx → Node.js). Frontend y API comparten dominio, por lo que no hay problemas de CORS ni de cookies de terceros.
- **RDS MySQL** vive en subredes privadas sin ruta a Internet y solo acepta conexiones desde el security group de EC2.
- Los logos se guardan en un segundo **bucket S3 privado**; la API entrega URLs prefirmadas temporales.
- **Route 53** resuelve el dominio personalizado hacia CloudFront (registro alias), con certificado de **ACM**.
- **IAM**: la instancia usa un perfil de instancia (en Learner Lab, `LabInstanceProfile`); las políticas de mínimo privilegio
  objetivo están en [`infra/aws/iam`](infra/aws/iam).

Más diagramas: [componentes](docs/diagramas/02-componentes.png) · [flujo de reservas](docs/diagramas/03-flujo-reservas.png) ·
[modelo entidad-relación](docs/diagramas/04-modelo-entidad-relacion.png) · [pipeline CI/CD](docs/diagramas/05-pipeline-cicd.png) ·
[flujo Git](docs/diagramas/06-flujo-git.png). Detalle en [docs/arquitectura.md](docs/arquitectura.md).

## Estructura de carpetas

```
agenda-facil/
├── backend/                     API REST (Express + Prisma)
│   ├── prisma/                  schema.prisma, migraciones, seed de planes, seed DEMO opcional
│   ├── src/
│   │   ├── config/env.js        Variables de entorno validadas
│   │   ├── lib/                 tiempo, almacenamiento S3/local, errores, planes, serialización
│   │   ├── middleware/          autenticación JWT, roles, validación Zod, manejo de errores
│   │   ├── routes/              auth, public, client, business/* (perfil, servicios, clientes, reservas, dashboard)
│   │   ├── services/            availability.js (franjas) y reservations.js (transacciones)
│   │   ├── validators/          esquemas Zod
│   │   ├── app.js               Configuración de Express (helmet, CORS, rate limit, rutas)
│   │   └── server.js            Arranque y apagado ordenado
│   └── tests/                   unit/ y api/ (Vitest + Supertest contra MySQL real)
├── frontend/                    SPA React + Vite
│   └── src/
│       ├── api/                 Cliente HTTP
│       ├── components/          UI reutilizable, layouts, selector de horarios
│       ├── context/             Sesión (JWT) y notificaciones
│       ├── pages/               auth/, client/, business/, Landing
│       ├── styles/global.css    Sistema de diseño responsive
│       └── __tests__/           Pruebas de componentes
├── e2e/mvp-flow.cjs             Prueba E2E en navegador del flujo MVP completo
├── infra/aws/
│   ├── cloudformation/          Plantilla de infraestructura (VPC, EC2, RDS, S3, CloudFront, Route 53)
│   ├── ec2/                     bootstrap, despliegue con rollback, SQL de usuario de aplicación
│   ├── scripts/                 verificar servicios, desplegar, publicar, eliminar
│   └── iam/                     Políticas de mínimo privilegio
├── .github/                     Workflows CI/CD, plantillas de PR e issues, Dependabot
└── docs/                        Arquitectura, guías, diagramas, capturas, evidencias, Postman, documento APA
```

## Requisitos previos

- **Node.js 22** (mínimo 20) y npm 10.
- **MySQL 8.0** local (o Docker: `docker run -d -p 3306:3306 -e MYSQL_ROOT_PASSWORD=root mysql:8.0`).
- Git. Para desplegar: AWS CLI v2 y acceso a AWS Academy Learner Lab.

## Instalación y ejecución local

1. Clonar e instalar dependencias:

```bash
git clone https://github.com/OWNER/REPO.git agenda-facil
```

```bash
cd agenda-facil && npm run install:all
```

2. Crear la base de datos y un usuario **solo para desarrollo local**. Sustituye `<CLAVE_LOCAL>` por una contraseña elegida por ti, que deberás repetir en `DATABASE_URL` de `backend/.env` y `backend/.env.test.local` (ambos ignorados por Git); no la publiques. El permiso sobre `agenda\_facil\_test\_%` es necesario porque las pruebas crean una base temporal `agenda_facil_test_<marca>_<pid>` en cada ejecución:

```bash
mysql -u root -p -e "CREATE DATABASE agenda_facil; CREATE DATABASE agenda_facil_test; CREATE USER 'agenda'@'localhost' IDENTIFIED BY '<CLAVE_LOCAL>'; GRANT ALL ON agenda_facil.* TO 'agenda'@'localhost'; GRANT ALL ON agenda_facil_test.* TO 'agenda'@'localhost'; GRANT ALL ON \`agenda\\_facil\\_test\\_%\`.* TO 'agenda'@'localhost'; GRANT CREATE ON *.* TO 'agenda'@'localhost';"
```

3. Configurar variables de entorno:

```bash
cp backend/.env.example backend/.env
```

Edita `backend/.env` (`DATABASE_URL`, `JWT_SECRET`). Para las pruebas, crea `backend/.env.test.local` (ignorado por Git; nunca lo subas) con tu contraseña real:

```bash
DATABASE_URL="mysql://agenda:<CLAVE_LOCAL>@127.0.0.1:3306/agenda_facil_test"
```

Ese archivo tiene prioridad sobre `backend/.env.test`, que está versionado y solo contiene el marcador `CLAVE_LOCAL` y la configuración de pruebas compartida (las variables definidas en el sistema o en CI tienen prioridad sobre ambos). Si la contraseña contiene caracteres especiales, codifícalos para URL (p. ej. `@` → `%40`). Un error `P1000` al ejecutar las pruebas indica que la contraseña de `.env.test.local` no coincide con la de MySQL.

4. Migraciones y datos de referencia (planes):

```bash
npm run db:migrate --prefix backend && npm run db:seed --prefix backend
```

5. Ejecutar (dos terminales):

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

Abrir <http://localhost:5173>. Vite redirige `/api` al backend (puerto 3000).

> Datos de demostración **opcionales** (claramente marcados como DEMO, solo para desarrollo):
> `npm run db:seed:demo --prefix backend`.

## Variables de entorno

### Backend (`backend/.env`)

| Variable | Ejemplo | Descripción |
|---|---|---|
| `NODE_ENV` | `development` / `production` | Modo de ejecución |
| `PORT` | `3000` | Puerto HTTP de la API |
| `DATABASE_URL` | `mysql://usuario:clave@host:3306/agenda_facil` | Conexión MySQL / RDS |
| `JWT_SECRET` | 48+ bytes aleatorios | Firma de tokens (obligatorio ≥ 32 caracteres en producción) |
| `JWT_EXPIRES_IN` | `8h` | Duración de la sesión |
| `CORS_ORIGINS` | `http://localhost:5173` | Orígenes permitidos (coma) |
| `TRUST_PROXY` | `0` local, `2` en AWS | Proxies de confianza (CloudFront + Nginx) |
| `RATE_LIMIT_AUTH_MAX` | `20` | Intentos por IP cada 15 min en `/api/auth/*` |
| `STORAGE_DRIVER` | `local` / `s3` | Almacenamiento de logos |
| `S3_BUCKET`, `AWS_REGION` | `agenda-facil-uploads-…`, `us-east-1` | Solo con `s3` |

Generar un secreto: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

### Frontend (`frontend/.env`, opcional)

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | Vacío (recomendado): la API se sirve en el mismo dominio vía CloudFront `/api/*`. |

## Base de datos y migraciones

Modelo: `Plan`, `User`, `Business`, `Service`, `BusinessHour`, `Client`, `Reservation` — ver
[`backend/prisma/schema.prisma`](backend/prisma/schema.prisma) y el [diagrama E-R](docs/diagramas/04-modelo-entidad-relacion.png).

| Comando | Uso |
|---|---|
| `npm run db:migrate:dev --prefix backend -- --name descripcion` | Crear una migración nueva en desarrollo |
| `npm run db:migrate --prefix backend` | Aplicar migraciones pendientes (CI y producción) |
| `npm run db:seed --prefix backend` | Cargar/actualizar los planes (idempotente) |

Restricciones e índices destacados: correo único, `slug` único, servicio único por nombre y negocio, un horario por
día y negocio, cliente único por correo y negocio, índices `(business_id, start_at)` y `(business_id, status, start_at)`.

## Pruebas

| Tipo | Comando | Resultado verificado (27-nov-2026, local; reverificado en la auditoría) |
|---|---|---|
| Backend: unitarias + API (MySQL real) | `npm test --prefix backend` | **48/48** |
| Frontend: utilidades y componentes | `npm test --prefix frontend` | **10/10** |
| E2E en navegador (flujo MVP + responsive) | `npm run e2e` (con la app levantada) | **18/18 pasos** |
| Colección Postman (Newman) | `npx newman run docs/postman/Agenda-Facil.postman_collection.json -e docs/postman/Agenda-Facil-local.postman_environment.json` | **42 peticiones, 55 aserciones, 0 fallos** |
| Lint | `npm run lint` | Sin errores |
| Infraestructura | `cfn-lint`, `shellcheck`, `actionlint` (también en CI) | 0 errores (1 advertencia documentada de cfn-lint) |
| Simulación de despliegue en EC2 (release, migraciones, health check, rollback) | ver `docs/evidencias/simulacion-despliegue-ec2.md` | 5/5 escenarios |

Las pruebas del backend crean una base de datos temporal **nueva** en cada ejecución y la eliminan al final (nunca
borran datos existentes). Incluyen: registro, login, roles, servicios, horarios, disponibilidad, reservas,
**prevención de doble reserva con 10 peticiones simultáneas**, cancelaciones, aislamiento entre negocios, validación,
rate limiting, cabeceras de seguridad y subida de archivos. Evidencias en [`docs/evidencias`](docs/evidencias).

Prueba E2E (requiere backend en `:3000` y `npx vite preview --port 4173` en `frontend/` tras `npm run build`):

```bash
BASE_URL=http://localhost:4173 node e2e/mvp-flow.cjs
```

## API REST

Prefijo `/api`. Autenticación: `Authorization: Bearer <token>`. Errores: `{ "error": { "code", "message", "details" } }`.

| Método y ruta | Rol | Descripción |
|---|---|---|
| `GET /health` | público | Estado de la API y la BD |
| `POST /auth/register/business` · `POST /auth/register/client` · `POST /auth/login` | público | Registro e inicio de sesión (rate limit) |
| `GET/PUT /auth/me` · `PUT /auth/password` | autenticado | Perfil y contraseña |
| `GET /public/plans` · `GET /public/businesses` · `GET /public/businesses/:slug` | público | Planes, directorio, detalle |
| `GET /public/businesses/:slug/availability?serviceId&date` | público | Franjas disponibles |
| `POST /client/reservations` · `GET /client/reservations?scope` · `PATCH /client/reservations/:id/cancel` | CLIENT | Reservar, consultar, cancelar |
| `GET/PUT /business/profile` · `PUT /business/settings` · `PUT /business/plan` · `POST/DELETE /business/logo` | BUSINESS_ADMIN | Perfil, preferencias, plan, logo |
| `GET/PUT /business/hours` | BUSINESS_ADMIN | Horario semanal |
| `GET/POST /business/services` · `GET/PUT/DELETE /business/services/:id` | BUSINESS_ADMIN | CRUD de servicios |
| `GET/POST /business/clients` · `GET/PUT/DELETE /business/clients/:id` · `GET /business/clients/:id/reservations` | BUSINESS_ADMIN | CRUD de clientes e historial |
| `GET/POST /business/reservations` · `GET/PUT /business/reservations/:id` · `PATCH /business/reservations/:id/status` | BUSINESS_ADMIN | CRUD de citas y estados |
| `GET /business/reservations/availability` · `GET /business/dashboard` | BUSINESS_ADMIN | Disponibilidad y panel |

Colección lista para importar: [`docs/postman`](docs/postman).

## CI/CD con GitHub Actions

| Workflow | Disparador | Etapas |
|---|---|---|
| [`ci.yml`](.github/workflows/ci.yml) | PR y push a `develop`/`main` | Backend: `npm ci` → lint → build → pruebas con MySQL 8 (servicio). Frontend: `npm ci` → lint → pruebas → build (artefacto). Infraestructura: cfn-lint, ShellCheck, actionlint. E2E: Playwright del flujo MVP (artefacto con capturas). |
| [`deploy.yml`](.github/workflows/deploy.yml) | CI exitoso en `main`, o manual con `ref` | Backend → EC2 por SSH (release nueva, migraciones, health check, **rollback automático**). Frontend → S3 + invalidación de CloudFront. Solo si la variable `AWS_DEPLOY_ENABLED` = `true`. |

**Rollback**: (1) automático si el health check falla tras desplegar; (2) `Actions → Deploy → Run workflow` con el
commit/tag anterior en `ref`; (3) en el servidor: `sudo bash /tmp/agenda-deploy/infra/aws/ec2/rollback.sh` (solo considera
releases marcadas como sanas con `.deploy-ok`). Ensayado localmente: ver `docs/evidencias/simulacion-despliegue-ec2.md`.
Secretos y variables necesarios: ver encabezado de [`deploy.yml`](.github/workflows/deploy.yml) y
[docs/guia-aws-academy.md](docs/guia-aws-academy.md).

> Los workflows **aún no se han ejecutado en GitHub** (el repositorio remoto no existe todavía). Sus comandos se
> ejecutaron localmente con éxito; la primera ejecución real ocurrirá al hacer push.

## Despliegue en AWS Academy

Guía paso a paso: **[docs/guia-aws-academy.md](docs/guia-aws-academy.md)**. Resumen:

```bash
bash infra/aws/scripts/00-verificar-servicios.sh
```

```bash
export DB_MASTER_PASSWORD='UnaClaveSegura_2026' && bash infra/aws/scripts/01-desplegar-infraestructura.sh
```

Luego: crear el usuario de aplicación en RDS desde EC2 (`infra/aws/ec2/crear-usuario-app.sql`), cargar secretos y
variables en GitHub, activar `AWS_DEPLOY_ENABLED=true` y hacer push a `main`. Para ahorrar créditos:
`bash infra/aws/scripts/99-eliminar-infraestructura.sh`.

## Dominio personalizado

Sin dominio, la app queda accesible por HTTPS en `https://dxxxxxxxx.cloudfront.net`. Para un dominio propio
(registrado fuera de AWS Academy, que no permite registrar dominios): certificado ACM en `us-east-1` validado por DNS →
parámetros `DomainName`, `AcmCertificateArn` y (si se usa Route 53) `HostedZoneId` en el stack. Detalle en la guía.
**El dominio aún no existe**: ninguna URL de producción de este README está activa.

## Capturas de pantalla

Capturas reales tomadas por la prueba E2E automatizada en **entorno local** (no corresponden a AWS):

| Landing | Panel del negocio | Reserva del cliente |
|---|---|---|
| ![Landing](docs/capturas/01-landing-escritorio.png) | ![Panel](docs/capturas/13-dashboard-escritorio.png) | ![Reserva](docs/capturas/06-reserva-disponibilidad.png) |

| Agenda (tablet) | Panel (móvil) | Horarios ocupados (móvil) |
|---|---|---|
| ![Agenda tablet](docs/capturas/16-agenda-tablet.png) | ![Panel móvil](docs/capturas/14-dashboard-movil.png) | ![Móvil](docs/capturas/08-reserva-movil-horarios-ocupados.png) |

Todas las capturas: [`docs/capturas`](docs/capturas). Las capturas del despliegue en AWS deben tomarlas los integrantes
(ver [docs/evidencias-requeridas.md](docs/evidencias-requeridas.md)).

## Seguridad

Contraseñas con bcrypt · validación de entradas con Zod · consultas parametrizadas (Prisma) contra SQL injection ·
JWT con emisor/audiencia y expiración · control de acceso por rol · aislamiento multi-tenant · rate limiting en
autenticación · helmet · CORS con lista blanca · límites de tamaño de petición y de archivos (validación de tipo real
por *magic bytes*) · secretos solo en variables de entorno / GitHub Secrets · HTTPS en CloudFront · RDS privada ·
buckets S3 privados con OAC · IMDSv2 · usuario de BD de aplicación con privilegios limitados. Ver
[docs/arquitectura.md#seguridad](docs/arquitectura.md#seguridad).

## Integrantes

| Integrante | Usuario GitHub | Rol en el proyecto |
|---|---|---|
| `[NOMBRE_INTEGRANTE_1]` | `[@usuario1]` | `[Rol: p. ej. Frontend]` |
| `[NOMBRE_INTEGRANTE_2]` | `[@usuario2]` | `[Rol: p. ej. Backend]` |
| `[NOMBRE_INTEGRANTE_3]` | `[@usuario3]` | `[Rol: p. ej. Base de datos]` |
| `[NOMBRE_INTEGRANTE_4]` | `[@usuario4]` | `[Rol: p. ej. AWS / DevOps]` |

> Completar con los datos reales del equipo. Docente: `[NOMBRE_DOCENTE]` · Curso: `[NOMBRE_CURSO]` · Institución: `[INSTITUCIÓN]`.

## Estado del proyecto

| Componente | Estado |
|---|---|
| Frontend React (10 páginas + panel) | ✅ Desarrollado y probado localmente |
| Backend API REST + reglas de negocio | ✅ Desarrollado y probado localmente (MySQL 8) |
| Base de datos (modelo, migraciones, seed) | ✅ Desarrollado |
| Pruebas (unitarias, API, componentes, E2E, Postman) | ✅ Ejecutadas con éxito en local |
| Workflows CI/CD | 🟡 Configurados y validados con actionlint; pendiente primera ejecución en GitHub |
| Infraestructura AWS (CloudFormation, scripts) | 🟡 Validada con `cfn-lint`; scripts de despliegue/rollback ensayados en simulación local; **no desplegada** |
| Dominio personalizado | ⏳ Pendiente (el equipo debe adquirir/conectar un dominio) |
| Pasarela de pagos | ❌ Fuera de alcance del MVP (planes sin cobro) |
| Múltiples usuarios por negocio (Plan Profesional) | ❌ Mejora futura |

## Licencia

[MIT](LICENSE).
