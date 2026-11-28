# Despliegue real en AWS Academy Learner Lab

Fecha: **2026-11-28** · Región: **us-east-1** · Stack: **`agenda-facil`** · Commit desplegado: **`1bb06cc`** (`main`)

**URL pública: <https://52-54-96-26.sslip.io>** (HTTPS con certificado de Let's Encrypt; HTTP redirige a HTTPS).

> Todos los datos de este documento salen de comandos ejecutados contra la cuenta del Learner Lab. El ID de cuenta y
> el usuario del laboratorio se sustituyeron por `<cuenta>` / `<usuario-learner-lab>`. Ninguna contraseña aparece aquí.

## 1. Verificación previa de servicios

`infra/aws/scripts/00-verificar-servicios.sh` → [`verificacion-servicios.txt`](verificacion-servicios.txt):

| Servicio | Resultado |
|---|---|
| EC2, key pair `vockey`, `LabInstanceProfile`, RDS (MySQL 8.4), S3, Route 53, ACM, CloudFormation, SSM | OK |
| **CloudFront** (`list-distributions`, `list-functions`) | **BLOQUEADO** |

Comprobación adicional: `list-cache-policies`, `list-origin-access-controls`, `list-response-headers-policies`,
`list-cloud-front-origin-access-identities` y `get-distribution` → `AccessDenied` (*no identity-based policy allows the
cloudfront:… action*). El bloqueo es total, no solo de listado.

**Decisión:** desplegar con el parámetro nuevo `EnableCloudFront=false` (la alternativa ya prevista en la guía §8):
Nginx en EC2 sirve el frontend y la API en el mismo dominio, con HTTPS de Let's Encrypt. El resto de la arquitectura
(VPC, subredes privadas, RDS privada, S3 privado, IP elástica, perfil `LabInstanceProfile`) es la diseñada.

## 2. Infraestructura creada (CloudFormation `CREATE_COMPLETE`)

```bash
ENABLE_CLOUDFRONT=false bash infra/aws/scripts/01-desplegar-infraestructura.sh
```

| Recurso | Configuración real verificada |
|---|---|
| VPC `10.20.0.0/16` | 2 subredes públicas, 2 privadas (sin ruta a Internet), Internet Gateway. **Sin NAT Gateway** (0 en la cuenta) |
| EC2 `agenda-facil-api` | `t3.micro`, Amazon Linux 2023, `running`, IMDSv2 obligatorio (`HttpTokens: required`), perfil `LabInstanceProfile`, EBS gp3 16 GB cifrado |
| IP elástica | `52.54.96.26` asociada a la instancia |
| SG web | 80 y 443 desde `0.0.0.0/0` (80 solo redirige a HTTPS), 22 desde `0.0.0.0/0` (solo llave; necesario para GitHub Actions) |
| SG base de datos | 3306 **solo** desde el SG web |
| RDS `agenda-facil-db` | MySQL **8.4.11**, `db.t3.micro`, **Single-AZ**, **no pública**, almacenamiento cifrado, 20 GB gp2, backups 1 día, `available` |
| S3 `agenda-facil-uploads-<cuenta>` | Block Public Access: 4 × `True`, cifrado AES-256, versionado, solo HTTPS |
| No creados (modo sin CloudFront) | Bucket de frontend, OAC, CloudFront Function, cache policy, distribución, registros Route 53 |

Usuario de aplicación en RDS (creado desde EC2 con `infra/aws/ec2/crear-usuario-app.sql`):

```
usuario         bd            version_mysql
agenda_app@%    agenda_facil  8.4.11
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, REFERENCES, INDEX, ALTER ON `agenda_facil`.* TO `agenda_app`@`%`
```

## 3. Servidor

- Bootstrap (user data): `cloud-init status: done`, Node **v22.23.5**, Nginx activo, servicio `agenda-facil-api` habilitado.
- HTTPS: `sudo bash configurar-https.sh 52-54-96-26.sslip.io` → certificado emitido (vence 2027-02-25), redirección
  HTTP→HTTPS, renovación automática con `certbot-renew.timer`.
- `server_tokens off` global (la cabecera `Server` muestra solo `nginx`).

## 4. Despliegue con GitHub Actions

- Entorno `production`: revisor obligatorio (propietario) y solo rama `main`. Secretos del entorno: `EC2_HOST`,
  `EC2_SSH_KEY`, `PROD_DATABASE_URL`, `PROD_JWT_SECRET`. Variables: `AWS_REGION`, `S3_UPLOADS_BUCKET`, `PUBLIC_ORIGIN`,
  `TRUST_PROXY=1`, `AWS_DEPLOY_ENABLED=true`. **No hay credenciales de AWS en GitHub** (no se necesitan sin CloudFront).
- Rama `main` protegida: PR obligatorio + 4 checks de CI, sin *force push*.
- Ejecución [Deploy #2](https://github.com/dylanfuentes0330/agenda-facil/actions/runs/46090981443) (tras CI
  [46090716575](https://github.com/dylanfuentes0330/agenda-facil/actions/runs/46090716575) en verde, aprobada por el propietario):
  - `Autorizar origen del despliegue`: éxito (commit `1bb06cc` contenido en `main`, evento `push`).
  - `Backend → EC2`: **éxito** — release `20261128011343-1bb06cc`, `npm ci`, `prisma migrate deploy` (migración
    `20261127002845_init` aplicada en RDS), seed de planes, health check correcto.
  - `Frontend → EC2`: el frontend **quedó publicado**, pero el job terminó en error por la comprobación final de
    `remote-frontend.sh` (tras activar HTTPS, `http://127.0.0.1/` ya no sirve la SPA). Corregido en `192a3a1`
    (acepta HTTPS local) y probado en el servidor (`rc=0`); el siguiente despliegue lo ejecuta desde el workflow.

## 5. Funcionamiento verificado en producción

**E2E en navegador contra la URL pública** (`BASE_URL=https://52-54-96-26.sslip.io node e2e/mvp-flow.cjs`):
**18/18 pasos** — ver [`resultado-e2e-produccion.md`](resultado-e2e-produccion.md) y las 17 capturas en
[`docs/capturas/aws/`](../capturas/aws/) (prefijo `prod-`). Incluye registro de negocio y clientes, servicios, horarios,
reserva, horario ocupado bloqueado para otro cliente, reprogramación, cita manual, cancelaciones, historial, panel,
responsive y control de acceso.

**Verificación técnica** (`node e2e/verificar-produccion.mjs https://52-54-96-26.sslip.io`) — [`verificacion-produccion.txt`](verificacion-produccion.txt), 11/11:

| Comprobación | Resultado |
|---|---|
| Registro de negocio (escritura en RDS) | 201 |
| Subida de logo → S3 y URL prefirmada | 200; descarga 200 `image/png` |
| Mismo objeto de S3 sin firma | 403 (bucket privado) |
| `PUT /api/business/hours` con 30 000 filas (H-16) | 400, respuesta de 244 bytes |
| Panel sin token / con token de cliente | 401 / 403 |
| Frontend y ruta interna de la SPA | 200 / 200, con HSTS, `nosniff`, `X-Frame-Options` |
| `/api/health` | `{"status":"ok","database":"ok",…}` |
| `http://` | 301 → `https://` |

Los datos de prueba creados (negocios “Verificación …” y los del E2E) son ficticios y pueden quedarse como datos de demostración.

## 6. Costos

Precios bajo demanda de us-east-1 (referencia; el Learner Lab descuenta del crédito de USD 50):

| Recurso | USD/hora aprox. | Notas |
|---|---|---|
| EC2 t3.micro | 0,0104 | Learner Lab detiene las instancias al terminar la sesión y las reanuda al iniciar otra |
| RDS db.t3.micro Single-AZ | 0,017 | Puede seguir consumiendo fuera de la sesión: detenerla tras la demostración (`aws rds stop-db-instance`; AWS la reinicia sola a los 7 días) |
| IPv4 pública (IP elástica) | 0,005 | Se cobra también con la instancia detenida |
| EBS gp3 16 GB + RDS gp2 20 GB | ≈0,005 | Almacenamiento, se cobra siempre |
| S3, transferencia | ≈0 | Volumen de demostración |
| **Total con todo encendido** | **≈0,037 (≈0,90/día)** | |
| Con EC2 y RDS detenidas | ≈0,010 (≈0,24/día) | Solo almacenamiento e IP |

Consumo mostrado por el Learner Lab durante el despliegue: **USD 0,8 de 50** (el contador se actualiza con varias horas
de retraso; revisarlo en la próxima sesión).
