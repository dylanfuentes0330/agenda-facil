# Auditoría técnica — Agenda Fácil

**Fecha:** 2026-11-27 · **Alcance:** repositorio `/home/user/agenda-facil` (7 ramas, etiqueta `v1.0.0-mvp`) y carpeta
`/home/user/ENTREGA_FINAL`. · **Método:** no se aceptó como evidencia el informe anterior; cada afirmación se
re-ejecutó o se revisó contra el código. Las correcciones están en la rama `fix/auditoria-final`.

## 1. Resumen ejecutivo

- El software **funciona como se reportó**: los resultados de pruebas anteriores se reprodujeron exactamente.
- Se encontraron **2 errores críticos en el despliegue** que habrían hecho fallar el primer despliegue real o el
  rollback, **3 errores en una corrección intermedia y en workflows**, **2 riesgos de seguridad** y varias
  **inconsistencias documentales**. Todos fueron corregidos y verificados (ver §3).
- **Actualización 2026-11-28:** el repositorio está publicado en GitHub (CI en verde en cada PR/push, `main`
  protegida) y la aplicación está **desplegada en AWS Academy Learner Lab** en <https://52-54-96-26.sslip.io>,
  verificada con el E2E completo contra la URL pública (18/18). El despliegue real destapó H-18 a H-20 (abajo).
  No existe dominio propio. Evidencias: [`docs/evidencias/despliegue-aws.md`](docs/evidencias/despliegue-aws.md).

## 2. Verificación del informe anterior

| Afirmación del informe | Comprobación en esta auditoría | Resultado |
|---|---|---|
| Frontend React 19 + Vite y backend Node 22 + Express existen | Inspección de `frontend/`, `backend/`, `package.json` | **Confirmado** |
| Prisma + MySQL 8 con migraciones | `prisma/schema.prisma`, migración `20261127002845_init`, `migrate deploy` en BD vacía (simulación) | **Confirmado** |
| Backend 46/46 | Re-ejecutado | **Confirmado** (48/48 tras la auditoría; 50/50 tras H-16) |
| Frontend 10/10 | Re-ejecutado | **Confirmado** |
| Playwright 18/18 | Re-ejecutado dos veces (antes y después de correcciones) | **Confirmado** |
| Newman 42 peticiones / 55 aserciones | Re-ejecutado | **Confirmado** |
| CI simulado en clon limpio | Re-ejecutado sobre clon limpio de `fix/auditoria-final` | **Confirmado** (`docs/evidencias/reejecucion-auditoria.txt`) |
| Workflows válidos | Antes solo se había validado la sintaxis YAML. Ahora **actionlint 1.7.12** | Válidos; 3 observaciones corregidas |
| CloudFormation desplegable | cfn-lint (0 errores, 1 advertencia W1011); revisión manual | Coherente; **no probada en AWS** |
| Scripts de despliegue funcionales | Antes solo ShellCheck. Ahora **ejecución real simulada** | **Tenían 2 errores críticos** (corregidos) |
| Sin credenciales expuestas | Escaneo de **todo el historial** git | **Confirmado**: solo marcadores de posición y credenciales efímeras de pruebas |

## 3. Hallazgos y correcciones

Severidad: **Crítica** (impide la entrega/operación) · **Alta** · **Media** · **Baja**.

| ID | Sev. | Componente | Hallazgo | Evidencia | Corrección | Estado |
|---|---|---|---|---|---|---|
| H-01 | Crítica | `rollback.sh` | Elegía como “release anterior” la carpeta previa por nombre, aunque fuera un despliegue fallido e incompleto. En la simulación dejó la **API caída** y no lo reportó. | Ensayo 4 de la simulación | Solo considera releases marcadas `.deploy-ok`; verifica salud; si falla, restaura la release original | Corregido y verificado |
| H-02 | Crítica | `remote-deploy.sh` | Los despliegues fallidos antes de activarse dejaban carpetas incompletas (origen de H-01). | Ensayo 1 | `trap` que elimina la release no activada; marca `.deploy-ok` solo tras health check | Corregido y verificado |
| H-03 | Alta | `remote-deploy.sh` | `npm`/`npx` se ejecutan con `sudo -u agenda`; en Amazon Linux 2023 `secure_path` de sudo no incluye `/usr/local/bin`, donde el bootstrap instala Node. | **Deducido** de la configuración por defecto de AL2023; no reproducible en este contenedor (aquí existe un enlace en `/usr/local/bin`) | `PATH` explícito en el script y pasado a `sudo` | Corregido; pendiente confirmar en EC2 real |
| H-04 | Alta | `remote-deploy.sh` (introducido en la primera corrección) | La limpieza de releases antiguas devolvía código 1 con menos de 5 releases (`grep -v` + `pipefail`): un despliegue **correcto** se reportaba como fallido. | Ensayos B y C de la simulación | `{ grep … \|\| true; }` | Corregido y verificado |
| H-05 | Alta | Seguridad backend | En producción se aceptaba `JWT_SECRET` con el valor de ejemplo de `.env.example` (38 caracteres, superaba la validación de longitud) → sesiones falsificables si se copiaba el ejemplo. | Revisión de `config/env.js` | Rechazo de secretos de ejemplo/prueba en producción + prueba unitaria | Corregido y probado |
| H-06 | Media | Reglas de negocio | Un cliente podía crear reservas ilimitadas y bloquear la agenda de un negocio (abuso/denegación de servicio). | Revisión de `routes/client.js` | Tope de 5 reservas futuras confirmadas por cliente y negocio; el negocio no tiene tope. Prueba con verificación de mutación | Corregido y probado |
| H-07 | Media | `deploy.yml` | `/tmp/agenda-deploy` no se limpiaba entre despliegues (archivos borrados podían reaparecer); variables sin comillas; archivo de entorno sin comillas (contraseñas con caracteres especiales rompían `source`). | actionlint SC2086 + revisión | Limpieza previa, arrays de opciones SSH, valores entre comillas simples; documentado que la clave de la URL debe ir codificada | Corregido; validado con actionlint |
| H-08 | Media | `ci.yml` | Si la API o el frontend no iniciaban en el job E2E, el bucle de espera terminaba sin error y la falla aparecía después con un mensaje confuso. | actionlint SC2034 + revisión | Falla explícita con los registros | Corregido |
| H-09 | Media | CI | La infraestructura (CloudFormation, scripts, workflows) no se validaba en CI. | Revisión | Nuevo job “Infraestructura”: cfn-lint, ShellCheck, actionlint y verificación de que la plantilla generada coincide con su fuente | Corregido; validado localmente |
| H-10 | Media | CloudFront | El frontend estático se servía sin cabeceras de seguridad (HSTS, `nosniff`, `X-Frame-Options`). | Revisión de la plantilla | Política administrada `Managed-SecurityHeadersPolicy` en el comportamiento por defecto | Corregido; no probado en AWS |
| H-11 | Baja | README | La guía de instalación creaba el usuario MySQL con una contraseña distinta a la de `.env.test`: las pruebas fallaban siguiendo el README al pie de la letra. | Revisión | Contraseña local alineada y aclarada como solo-desarrollo | Corregido |
| H-12 | Baja | Documento APA | La Figura 12 se titulaba “panel del negocio y horarios ocupados” pero contenía una sola imagen; conteo de pruebas desactualizado tras las correcciones; diagrama CI/CD sin el job de infraestructura. | Revisión del PDF y verificación automática de numeración y citas | Título corregido, cifras y diagrama actualizados; se citó en el texto la referencia del manual APA, que figuraba en la lista sin citarse (APA 7 exige correspondencia); documento regenerado | Corregido |
| H-13 | Baja | Referencias | Los enlaces de las referencias no pudieron abrirse desde este entorno (red restringida). | Intento de verificación | Sin cambio posible aquí | **Pendiente (equipo)** |
| H-14 | Info | `.env.test` | Contenía una contraseña de base de datos **local de pruebas**. Ahora el archivo versionado solo tiene el marcador `CLAVE_LOCAL`; la credencial real de cada desarrollador va en `backend/.env.test.local` (ignorado por Git), que las pruebas cargan con prioridad. CI usa su propio contenedor efímero vía variable de entorno. | Escaneo de secretos | Credencial movida a archivo local ignorado; `tests/global-setup.js` avisa si se usa el marcador | Corregido |
| H-15 | Info | Nginx | `nginx -t` valida la sintaxis; el único error es `listen [::]:80` porque este contenedor no tiene IPv6 (AL2023 sí). | `nginx -t` | Ninguna | Aceptado |
| H-16 | Alta | Validación (Zod 3) | GHSA-mrhx-c7xc-m3w5: Zod < 4.6.6 valida cada elemento de colecciones con restricción de tamaño aunque la longitud ya sea inválida. `PUT /api/business/hours` con un array de ~30 000 filas (< 100 KB) generaba ~120 000 errores y una respuesta de varios MB (amplificación de CPU/memoria). La única corrección de npm es Zod 4 (cambio mayor). | `npm audit`; prueba con 30 000 filas | Se valida primero la longitud exacta (`z.array(z.unknown()).length(7).pipe(...)`) y el manejador de errores devuelve como máximo 20 detalles. 2 pruebas nuevas (respuesta < 2 KB). Zod se mantiene en 3.25.76 (es el único array de entrada de la API) | Mitigado y probado |
| H-18 | Alta | Learner Lab / CloudFront | El Learner Lab del equipo **deniega todas las acciones de CloudFront** (`list-*`, `get-distribution` → `AccessDenied`): la plantilla no podía crearse tal cual. | `00-verificar-servicios.sh` + llamadas de solo lectura | Parámetro `EnableCloudFront` (por defecto `true`). Con `false`: sin bucket de frontend ni CloudFront, SG 80/443, Nginx sirve la SPA, `configurar-https.sh` (Let's Encrypt), el workflow publica el frontend por SSH sin credenciales AWS, `TRUST_PROXY` configurable | Corregido y desplegado |
| H-19 | Media | `remote-frontend.sh` (nuevo) | En el primer Deploy real el frontend quedó publicado pero el job falló: tras activar HTTPS, `http://127.0.0.1/` ya no sirve la SPA (certbot deja el 80 solo para redirigir el nombre público). | Deploy #2, job *Frontend* | La comprobación acepta HTTP o HTTPS local; probado en el servidor | Corregido y verificado en EC2 |
| H-20 | Baja | Nginx | El bloque de redirección creado por certbot mostraba la versión de Nginx en la cabecera `Server`. | `curl -I` | `server_tokens off` global en `conf.d/00-seguridad.conf` | Corregido y verificado |
| H-17 | Media | Dependencias | `npm audit` del backend: `prisma` 6.19.3 (CLI, vía `@prisma/config` → `deepmerge-ts`, `effect`) y `vitest` 3.2 (`tinypool`, `@vitest/mocker`). Solo se corrigen con Prisma 7 / Vitest 5 (cambios mayores). Prisma CLI solo procesa la configuración del propio repositorio en `migrate deploy` (no recibe entrada de usuarios); Vitest es de desarrollo y no se instala con `--omit=dev`. Frontend: `npm audit --omit=dev` = 0 vulnerabilidades. | `npm audit`, `npm audit --omit=dev` | No se actualizan versiones mayores sin una migración planificada (Prisma 7 exige `prisma.config.ts` y adaptadores) | Aceptado y documentado |

## 4. Revisión por área (lo que se verificó y está correcto)

| Área | Verificación | Estado real |
|---|---|---|
| Registro e inicio de sesión | Pruebas API + E2E + Newman | Funciona (local) |
| Roles y permisos | Pruebas 401/403, ruta protegida en frontend, E2E (cliente no entra al panel) | Funciona (local) |
| Negocio: perfil, logo, preferencias, plan | Pruebas API + E2E | Funciona (local) |
| Servicios, horarios, clientes | Pruebas API + E2E + Newman | Funciona (local) |
| Reservas y cancelaciones (negocio y cliente) | Pruebas API + E2E + Newman | Funciona (local) |
| Prevención de doble reserva | 10 peticiones concurrentes + prueba de mutación | Funciona (local) |
| Aislamiento entre negocios | 6 pruebas dedicadas + carpeta 5 de Postman | Funciona (local) |
| Responsive | E2E sin desbordamiento en 3 tamaños × 11 rutas | Funciona (local) |
| Manejo de errores | Formato uniforme; pruebas 400/404/409/413/422/429 | Funciona (local) |
| Seguridad de la API | bcrypt, JWT, Zod, helmet, CORS, rate limit, validación de archivos | Implementado y probado |
| Base de datos | Migración aplicada en BD vacía por `remote-deploy.sh` (simulación) | Correcto |
| Diagramas | Contrastados con código y plantilla | Coherentes (CI/CD actualizado) |
| CloudFormation | cfn-lint + revisión: VPC con subredes públicas/privadas, RDS privada, SG EC2→RDS, S3 privados con OAC, CloudFront HTTPS, Route 53 condicional, IMDSv2, sin recursos IAM | Coherente; **no desplegada** |
| Scripts EC2 | Simulación de 5 escenarios (ver `docs/evidencias/simulacion-despliegue-ec2.md`) | Correctos tras H-01…H-04 |
| Workflows | actionlint sin hallazgos | Válidos; **sin ejecución en GitHub** |

## 5. Riesgos residuales

| Riesgo | Impacto | Mitigación / acción |
|---|---|---|
| Primer despliegue real nunca ejecutado en AWS | Puede aparecer un error propio de AL2023 o del Learner Lab | Seguir `docs/guia-aws-academy.md` y registrar el resultado |
| Restricciones no confirmadas del Learner Lab (SSM, CloudFront Functions, prefix list, RDS cifrado) | El stack podría fallar al crearse | `00-verificar-servicios.sh` antes de desplegar; alternativas en la guía §8 |
| SSH abierto a 0.0.0.0/0 si se usa despliegue automático | Superficie de ataque (mitigada: solo llave) | Restringir `SSH_CIDR` y desplegar manualmente si se prefiere |
| Tráfico CloudFront → EC2 por HTTP | Datos sin cifrar dentro de la red de AWS | Mejora futura: TLS en el origen o balanceador |
| `LabRole` con permisos amplios | No se cumple el mínimo privilegio en el laboratorio | Políticas objetivo en `infra/aws/iam` |
| Token JWT en `localStorage` | Exposición ante XSS | Expiración de 8 h; React escapa el contenido; sin HTML de usuario |
| Credenciales del Learner Lab caducan | Solo afecta al modo CloudFront (el despliegue real no usa credenciales AWS en GitHub) | Actualizar secretos antes de cada despliegue si se usa CloudFront |
| La app solo responde con la sesión del Learner Lab iniciada | Fuera de sesión EC2 se detiene y la URL no carga | Iniciar el laboratorio ~10 min antes de la demostración; la IP elástica conserva la URL |
| Dependencia del DNS público `sslip.io` | Si el servicio fallara, la URL no resolvería | Acceso alternativo por IP; con un dominio propio basta un registro A y `configurar-https.sh` |
| Historial inicial con autor “Claude Code (asistente IA)” | No acredita trabajo de integrantes | Cada integrante debe hacer commits y PRs propios |

## 6. Estado real de cada componente

| Componente | Diseñado | Desarrollado | Probado | Desplegado |
|---|---|---|---|---|
| Frontend | Sí | Sí | Sí (local y E2E en producción) | Sí (Nginx en EC2) |
| Backend / API | Sí | Sí | Sí (local, 50 pruebas; verificación en producción 11/11) | Sí (EC2) |
| Base de datos | Sí | Sí | Sí (MySQL 8.4 local y RDS) | Sí (RDS MySQL 8.4.11 privada) |
| Scripts de despliegue y rollback | Sí | Sí | Simulación local (5/5) + despliegue real | Sí |
| CloudFormation | Sí | Sí | cfn-lint + `CREATE_COMPLETE` | Sí (`EnableCloudFront=false`) |
| CI | Sí | Sí | Ejecutado en GitHub (4 jobs en verde) | — |
| CD | Sí | Sí | Deploy real: backend OK; frontend publicado, comprobación corregida (H-19) | Sí |
| Dominio | Sí | Configuración preparada | No | No existe (se usa `sslip.io`) |
| Documento académico | Sí | Sí | Revisado contra el código | Faltan datos personales y capturas AWS |
