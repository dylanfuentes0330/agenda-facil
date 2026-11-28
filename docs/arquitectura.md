# Arquitectura técnica — Agenda Fácil

## 1. Análisis de la propuesta original

Fuente: *Propuesta de Proyecto SaaS – Agenda Fácil* (PDF, 4 páginas). Se conservan: nombre, público objetivo,
funcionalidades para negocio y cliente, modelo de negocio (Plan Básico, Plan Profesional, prueba gratuita),
los seis servicios AWS (EC2, RDS, S3, CloudFront, Route 53, IAM), principios de seguridad (mínimo privilegio, BD sin
exposición pública, S3 privado, HTTPS) y la estimación de costos (presentada como estimación, no como cotización).

### Requisitos funcionales

| ID | Requisito | Implementación |
|---|---|---|
| RF-01 | Registro y administración de cuenta y perfil del negocio | `POST /auth/register/business`, `/panel/configuracion` |
| RF-02 | Registro de servicios y precios | CRUD `/business/services`, `/panel/servicios` |
| RF-03 | Configuración de horarios y días de atención | `PUT /business/hours`, `/panel/horarios` |
| RF-04 | Crear, modificar y cancelar reservas (negocio) | `/business/reservations`, `/panel/citas` |
| RF-05 | Panel con citas del día | `GET /business/dashboard`, `/panel` |
| RF-06 | Base de datos de clientes | CRUD `/business/clients`, `/panel/clientes` |
| RF-07 | Historial completo de reservas | `/business/clients/:id/reservations`, filtros en `/panel/citas` |
| RF-08 | Cliente consulta servicios disponibles | `/public/businesses/:slug`, `/reservar/:slug` |
| RF-09 | Cliente visualiza horarios libres en tiempo real | `/public/businesses/:slug/availability` |
| RF-10 | Cliente solicita una cita | `POST /client/reservations` |
| RF-11 | Cliente consulta su reserva | `GET /client/reservations`, `/mis-reservas` |
| RF-12 | Cliente cancela dentro del margen permitido | `PATCH /client/reservations/:id/cancel` + `cancellationHours` |
| RF-13 | Planes Básico/Profesional y prueba gratuita | Tabla `plans`, límites y estadísticas avanzadas; `trialEndsAt` (sin cobros) |
| RF-14 | Impedir reservas duplicadas o incompatibles | Transacción con bloqueo `FOR UPDATE` + validación de solapamiento |

### Requisitos no funcionales

| ID | Requisito | Cómo se atiende |
|---|---|---|
| RNF-01 Seguridad | bcrypt, JWT, roles, validación Zod, rate limiting, helmet, CORS, S3/RDS privados, HTTPS |
| RNF-02 Aislamiento multi-tenant | `businessId` derivado del usuario autenticado en cada consulta; pruebas dedicadas |
| RNF-03 Consistencia | Transacciones `READ COMMITTED` + bloqueo pesimista por negocio |
| RNF-04 Usabilidad | Interfaz en español, responsive (móvil/tablet/escritorio), estados de carga/error/éxito |
| RNF-05 Disponibilidad y escalabilidad | CloudFront + S3 para estáticos; API sin estado (JWT) → escalable horizontalmente detrás de un balanceador |
| RNF-06 Mantenibilidad | Monorepo, ESLint, pruebas automatizadas, migraciones versionadas, CI |
| RNF-07 Portabilidad | Variables de entorno; misma app en local y en AWS |
| RNF-08 Costo | Instancias micro, Single-AZ, eliminación del stack al terminar |

## 2. Decisiones técnicas (registro)

| # | Decisión | Alternativas | Justificación |
|---|---|---|---|
| D1 | React + Vite (SPA) servida desde S3 + CloudFront | Next.js con SSR | Build estático sin servidor adicional; encaja con S3/CloudFront de la propuesta |
| D2 | Node.js + Express en EC2 con Nginx y systemd | Lambda, Elastic Beanstalk, contenedores | Respeta EC2 de la propuesta; simple de explicar y depurar en Learner Lab |
| D3 | MySQL 8 + Prisma | Sequelize, SQL directo | Migraciones versionadas, tipado del esquema y consultas parametrizadas |
| D4 | JWT en cabecera `Authorization` | Sesiones con cookie | API sin estado; evita configurar sesiones compartidas. Riesgo XSS mitigado con React (escapado) y expiración de 8 h |
| D5 | Frontend y API en el mismo dominio vía CloudFront (`/api/*` → EC2) | API en subdominio propio | Un solo certificado, sin CORS en producción |
| D6 | Política de caché propia para `/api/*` con `Authorization` y TTL 0 | Caché deshabilitada administrada | CloudFront no reenvía `Authorization` en GET si no está en la política de caché |
| D7 | Fechas de reserva como “hora local del negocio” + zona horaria por negocio | UTC + conversión | Evita errores por la zona del servidor (EC2 en UTC); el cálculo de franjas es determinista |
| D8 | Bloqueo pesimista `SELECT … FOR UPDATE` sobre la fila del negocio | Índice único parcial, bloqueo optimista | MySQL no tiene índices parciales; con solapamientos de distinta duración un índice único no basta |
| D9 | Baja lógica de servicios con historial; clientes con historial no se eliminan | Borrado en cascada | Conserva el historial de reservas |
| D10 | Planes sin pasarela de pago | Integrar pagos simulados | Requisito: no simular cobros; solo límites funcionales reales |
| D11 | CloudFormation sin recursos IAM, con `LabInstanceProfile` | Terraform, creación manual | Learner Lab no permite crear roles; plantilla reproducible y validable (`cfn-lint`) |
| D12 | Despliegue por releases + enlace simbólico + health check | `git pull` en el servidor | Permite rollback inmediato y automático |
| D14 | Tope de 5 reservas futuras por cliente y negocio | Sin límite; captcha | Evita que un cliente bloquee la agenda; el negocio no tiene tope |
| D15 | Releases marcadas `.deploy-ok` como único destino de rollback | Elegir la carpeta anterior por nombre | La auditoría demostró que elegir por nombre podía activar un despliegue incompleto |
| D13 | Pruebas con base de datos temporal por ejecución | `migrate reset` sobre una BD fija | Nunca borra datos existentes; Prisma bloquea `reset` ejecutado por agentes de IA sin consentimiento |

## 3. Vistas de arquitectura

- Arquitectura AWS: [diagramas/01-arquitectura-aws.png](diagramas/01-arquitectura-aws.png)
- Componentes: [diagramas/02-componentes.png](diagramas/02-componentes.png)
- Flujo de reservas (secuencia con transacción): [diagramas/03-flujo-reservas.png](diagramas/03-flujo-reservas.png)
- Modelo entidad-relación: [diagramas/04-modelo-entidad-relacion.png](diagramas/04-modelo-entidad-relacion.png)
- Pipeline CI/CD: [diagramas/05-pipeline-cicd.png](diagramas/05-pipeline-cicd.png)
- Flujo Git: [diagramas/06-flujo-git.png](diagramas/06-flujo-git.png)

Las fuentes `.mmd` (Mermaid) están versionadas junto a cada imagen.

### Algoritmo de disponibilidad

Para un servicio de duración *d* y un día con horario `[apertura, cierre)`, se generan franjas cada *intervalo*
minutos desde la apertura mientras `inicio + d ≤ cierre`. Una franja está disponible si no es pasada (según la hora
local del negocio) y no se solapa con ninguna reserva en estado `CONFIRMED`, `COMPLETED` o `NO_SHOW`
(`inicio_existente < fin_nueva` y `fin_existente > inicio_nueva`). La misma regla se vuelve a verificar dentro de la
transacción al crear o mover una reserva.

## 4. Seguridad

| Amenaza / requisito | Control implementado | Evidencia |
|---|---|---|
| Robo de contraseñas | bcrypt (12 rondas en producción); hash nunca expuesto | Prueba “guarda la contraseña cifrada” |
| Enumeración de usuarios | Mismo mensaje y comparación contra hash ficticio cuando el correo no existe | Prueba de login |
| Fuerza bruta | `express-rate-limit`: 20 intentos/15 min/IP en `/api/auth/*` | Prueba 429 y `docs/evidencias/rate-limit-segunda-ejecucion-newman.txt` |
| SQL Injection | Prisma (consultas parametrizadas); único SQL manual usa *tagged template* parametrizado | Revisión de código |
| Entradas inválidas | Zod en body/query/params; límites de longitud; JSON ≤ 100 KB | Pruebas de validación |
| Archivos maliciosos | Tipo verificado por *magic bytes*, 2 MB máx., nombre aleatorio | Prueba de logo falso |
| Acceso no autorizado | JWT con `iss`/`aud`/expiración; usuario recargado de BD en cada petición | Pruebas 401 |
| Escalada de privilegios | `requireRole` por grupo de rutas | Pruebas 403 |
| Fuga entre negocios (multi-tenant) | `businessId` del token, filtros `businessId` en todas las consultas → 404 | `tests/api/isolation.test.js` |
| Cabeceras inseguras | helmet en la API (CSP, nosniff, HSTS…), `x-powered-by` deshabilitado; `Managed-SecurityHeadersPolicy` de CloudFront para el frontend | Prueba de cabeceras |
| Abuso de reservas | Máximo 5 reservas futuras por cliente y negocio | Prueba con verificación de mutación |
| Secreto JWT débil en producción | El servidor no arranca con secretos de ejemplo o cortos | Prueba unitaria |
| CORS | Lista blanca por variable `CORS_ORIGINS` | Prueba de CORS |
| Secretos | `.env` ignorado; GitHub Secrets; `NoEcho` en CloudFormation | `.gitignore`, workflows |
| Transporte | HTTPS en CloudFront (`redirect-to-https`/`https-only`, TLS 1.2+ con dominio propio); S3 deniega HTTP | Plantilla |
| Exposición de la BD | RDS en subredes privadas, `PubliclyAccessible: false`, SG solo desde EC2 | Plantilla |
| Exposición de EC2 | Con CloudFront: puerto 80 solo desde su prefix list. Sin CloudFront (despliegue real): 80 → redirección a HTTPS y 443 con Let's Encrypt, HSTS. SSH con llave; IMDSv2 | Plantilla |
| Mínimo privilegio | Usuario de BD de aplicación limitado a `agenda_facil`; políticas IAM objetivo | `infra/aws` |

Riesgos residuales: tráfico CloudFront → EC2 por HTTP dentro de la red de AWS (mejora: certificado en el origen o ALB);
token en `localStorage` (mitigado con expiración corta); permisos amplios de `LabRole` en Learner Lab.

## 5. Estado: diseñado, desarrollado, probado, desplegado

| Elemento | Diseñado | Desarrollado | Probado | Desplegado en AWS |
|---|---|---|---|---|
| Frontend React | Sí | Sí | Sí (componentes + E2E local y en producción) | Sí (Nginx en EC2) |
| API REST | Sí | Sí | Sí (50 pruebas + Newman) | Sí (EC2, Node 22) |
| Modelo de datos y migraciones | Sí | Sí | Sí (MySQL 8.4 local y RDS) | Sí (RDS MySQL 8.4.11, migración aplicada) |
| Prevención de doble reserva | Sí | Sí | Sí (10 peticiones concurrentes; E2E en producción) | Sí |
| CI (GitHub Actions) | Sí | Sí | Ejecutado en GitHub en cada PR/push (4 jobs en verde) | — |
| Scripts de despliegue y rollback | Sí | Sí | Simulación local + despliegue real en EC2 | Sí |
| CD (deploy.yml) | Sí | Sí | Ejecutado: backend correcto; frontend publicado (comprobación final corregida) | Sí |
| CloudFormation (VPC, EC2, RDS, S3, CloudFront, Route 53) | Sí | Sí | `cfn-lint` + `CREATE_COMPLETE` | Sí, con `EnableCloudFront=false` (CloudFront bloqueado en el Learner Lab) |
| Dominio personalizado | Sí | Configuración preparada | No | No (URL `sslip.io` con HTTPS de Let's Encrypt) |
| Rol IAM de mínimo privilegio | Sí | Políticas JSON | No | No aplicable en Learner Lab |
| Múltiples usuarios por negocio, pagos, notificaciones | Propuesto como mejora | No | No | No |
