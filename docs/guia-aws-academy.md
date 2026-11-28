# Guía de despliegue en AWS Academy Learner Lab

> **Estado:** nada de esta guía se ha ejecutado todavía en una cuenta AWS. El equipo debe seguirla desde su
> Learner Lab y guardar evidencias reales (capturas y salidas de comandos). No reportes un recurso como desplegado
> hasta haberlo visto funcionando.

## 0. Arquitectura propuesta vs. arquitectura desplegable

| Servicio (propuesta original) | Cómo se usa en Agenda Fácil | Notas para Learner Lab |
|---|---|---|
| Amazon EC2 | API Node.js/Express detrás de Nginx, t3.micro, Amazon Linux 2023, IP elástica | Se detiene al terminar la sesión; la IP elástica conserva la dirección |
| Amazon RDS | MySQL 8.4 LTS, db.t3.micro, 20 GB, subredes privadas, cifrado | Puede tardar ~10-15 min en crearse. No usar 8.0: salió de soporte estándar y cobra Extended Support |
| Amazon S3 | Bucket privado del frontend + bucket privado de logos | Nombres únicos con el ID de cuenta |
| Amazon CloudFront | HTTPS, frontend desde S3 (OAC) y `/api/*` hacia EC2 | Crear/actualizar tarda ~5-15 min |
| Amazon Route 53 | Registro alias del dominio hacia CloudFront | Learner Lab **no permite registrar dominios**; se usa un dominio externo |
| AWS IAM | Perfil `LabInstanceProfile` en EC2; políticas objetivo en `infra/aws/iam` | Learner Lab **no permite crear roles/usuarios IAM** |

Toda la infraestructura está descrita en `infra/aws/cloudformation/agenda-facil.yaml` (validada con `cfn-lint`).

## 1. Preparar la sesión

1. Entrar a AWS Academy → curso → *Learner Lab* → **Start Lab** (esperar el indicador verde).
2. *AWS Details* → copiar `aws_access_key_id`, `aws_secret_access_key`, `aws_session_token` y descargar la llave **PEM** (`labsuser.pem`).
3. En tu equipo (con [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)) pega las credenciales en `~/.aws/credentials` bajo `[default]` y define la región:

```bash
aws configure set region us-east-1
```

```bash
chmod 400 ~/Downloads/labsuser.pem
```

> Las credenciales del Learner Lab son **temporales**: cambian en cada sesión. Repite este paso (y actualiza los
> secretos de GitHub) cada vez que inicies el laboratorio.

## 2. Verificar qué servicios permite tu laboratorio

```bash
bash infra/aws/scripts/00-verificar-servicios.sh
```

Guarda `verificacion-servicios.txt` en `docs/evidencias/` (evidencia). Si algún servicio aparece **BLOQUEADO**, consulta la
sección 8 (alternativas).

## 3. Crear la infraestructura (CloudFormation)

Elige una contraseña para el administrador de RDS (12+ caracteres, letras/números/`_#%+=-`). **No la subas a GitHub.**

```bash
export DB_MASTER_PASSWORD='Elige_Una_Clave_2026'
```

Opcional, restringir SSH a tu IP (recomendado si no usarás despliegue automático por SSH):

```bash
export SSH_CIDR="$(curl -s https://checkip.amazonaws.com)/32"
```

```bash
bash infra/aws/scripts/01-desplegar-infraestructura.sh
```

Al terminar se muestran (y se guardan en `infra/aws/outputs.json`, ignorado por git) los valores:
`CloudFrontUrl`, `DistributionId`, `FrontendBucketName`, `UploadsBucketName`, `ApiPublicIp`, `DatabaseEndpoint`.

Alternativa por consola: *CloudFormation → Create stack → Upload a template file* → `agenda-facil.yaml`.

## 4. Configurar la base de datos (usuario de aplicación)

RDS no tiene acceso público: se configura **desde EC2**.

```bash
scp -i ~/Downloads/labsuser.pem infra/aws/ec2/crear-usuario-app.sql ec2-user@IP_ELASTICA:/tmp/
```

```bash
ssh -i ~/Downloads/labsuser.pem ec2-user@IP_ELASTICA
```

Dentro de EC2: edita `/tmp/crear-usuario-app.sql` (reemplaza `CAMBIAR_CLAVE_SEGURA`) y ejecútalo:

```bash
mysql -h ENDPOINT_RDS -u agenda_admin -p < /tmp/crear-usuario-app.sql
```

Comprueba que el bootstrap terminó: `systemctl status nginx` y `node -v` (debe ser v22).

## 5. Configurar GitHub (secretos y variables)

*Repositorio → Settings → Secrets and variables → Actions*:

| Tipo | Nombre | Valor |
|---|---|---|
| Secret | `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_SESSION_TOKEN` | Credenciales de *AWS Details* (actualizar cada sesión) |
| Secret | `EC2_HOST` | `ApiPublicIp` |
| Secret | `EC2_SSH_KEY` | Contenido completo de `labsuser.pem` |
| Secret | `PROD_DATABASE_URL` | `mysql://agenda_app:CLAVE@ENDPOINT_RDS:3306/agenda_facil` (la clave debe ir **codificada para URL** y sin comillas simples; recomendable usar solo letras, números y `_`) |
| Secret | `PROD_JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| Variable | `AWS_REGION` | `us-east-1` |
| Variable | `S3_FRONTEND_BUCKET` / `S3_UPLOADS_BUCKET` | Outputs del stack |
| Variable | `CLOUDFRONT_DISTRIBUTION_ID` | `DistributionId` |
| Variable | `PUBLIC_ORIGIN` | `CloudFrontUrl` (o `https://tu-dominio` cuando exista) |
| Variable | `AWS_DEPLOY_ENABLED` | `true` (actívalo solo cuando todo lo anterior esté listo) |

**Protección del entorno `production` (obligatoria antes de activar `AWS_DEPLOY_ENABLED`).** El repositorio es público, así
que los secretos de despliegue no deben quedar al alcance de cualquier workflow:

1. *Settings → Environments → New environment* → `production`.
2. **Required reviewers**: al menos una persona del equipo (y marcar *Prevent self-review* si sois varios).
3. **Deployment branches and tags** → *Selected branches and tags* → `main`.
4. Guardar `EC2_SSH_KEY`, `PROD_DATABASE_URL`, `PROD_JWT_SECRET` y las tres credenciales `AWS_*` como **secretos del
   entorno** `production` (no como secretos del repositorio): así solo se entregan a los jobs de despliegue tras la aprobación.
5. *Settings → Branches*: proteger `main` (PR obligatorio y checks de CI) para que nadie despliegue con un *push* directo.

El workflow, además, solo despliega commits que pertenecen a `main`: una ejecución de CI originada por un *pull request* o
por un fork nunca activa el despliegue (job `authorize` de `deploy.yml`).

## 6. Desplegar

Automático: hacer merge a `main` (o *Actions → Deploy → Run workflow* eligiendo la rama `main`; el campo opcional `ref`
acepta un commit o etiqueta **contenido en `main`**, útil para volver a una versión anterior). El workflow:

1. Empaqueta el backend, escribe `/etc/agenda-facil/api.env` desde los secretos, crea una release en `/opt/agenda-facil/releases`, ejecuta `npm ci`, `prisma migrate deploy`, carga los planes, cambia el enlace `current`, reinicia el servicio y verifica `/api/health`; si falla, **revierte** a la release anterior.
2. Compila el frontend, lo sincroniza en S3 e invalida CloudFront.

Manual (alternativa sin GitHub Actions): crear `/etc/agenda-facil/api.env` en EC2 con el mismo contenido que escribe
el workflow (ver `deploy.yml`) y ejecutar:

```bash
EC2_HOST=IP_ELASTICA SSH_KEY=~/Downloads/labsuser.pem bash infra/aws/scripts/03-publicar-backend.sh
```

```bash
S3_FRONTEND_BUCKET=... CLOUDFRONT_DISTRIBUTION_ID=... bash infra/aws/scripts/02-publicar-frontend.sh
```

Verificación: abrir `CloudFrontUrl`, registrar un negocio real del equipo y completar el flujo. `curl CloudFrontUrl/api/health`
debe responder `{"status":"ok","database":"ok",…}`.

## 7. Dominio personalizado

No se inventó ningún dominio. Pasos cuando el equipo disponga de uno:

1. **Obtener el dominio** en un registrador (p. ej. Namecheap, Porkbun, GoDaddy, o el registrador local del país). Algunos programas
   estudiantiles (p. ej. GitHub Student Developer Pack) han ofrecido dominios gratuitos por un año; verificar la oferta vigente.
2. **Certificado ACM** en la región **us-east-1** (obligatorio para CloudFront): *Certificate Manager → Request → Public* →
   `www.tudominio.com` (y opcionalmente `tudominio.com`) → validación **DNS** → crear el registro CNAME indicado en el DNS del dominio.
3. **DNS**, dos opciones:
   - **Route 53** (arquitectura propuesta): crear una *hosted zone* pública (≈ USD 0.50/mes según la estimación original) y en el
     registrador reemplazar los *nameservers* por los 4 NS de Route 53. Luego actualizar el stack con
     `DOMAIN_NAME`, `ACM_CERT_ARN` y `HOSTED_ZONE_ID` → crea los registros alias A/AAAA automáticamente.
   - **DNS del registrador** (si Route 53 no está disponible): actualizar el stack con `DOMAIN_NAME` y `ACM_CERT_ARN`, y crear en el
     registrador un **CNAME** `www → dxxxx.cloudfront.net`.
4. Actualizar la variable `PUBLIC_ORIGIN` en GitHub y redesplegar. Probar `https://www.tudominio.com/api/health`.

```bash
export DOMAIN_NAME=www.tudominio.com ACM_CERT_ARN=arn:aws:acm:us-east-1:...:certificate/... HOSTED_ZONE_ID=Z...
```

```bash
bash infra/aws/scripts/01-desplegar-infraestructura.sh
```

## 8. Limitaciones conocidas de Learner Lab y alternativas

Verifícalas en el *Readme* del propio laboratorio: las condiciones exactas pueden variar según el curso.

| Limitación | Impacto | Alternativa aplicada |
|---|---|---|
| Sin creación de roles/usuarios/políticas IAM | No se puede aplicar el rol de mínimo privilegio diseñado | Se usa `LabInstanceProfile`; políticas objetivo documentadas en `infra/aws/iam` |
| Credenciales temporales por sesión | Los secretos de GitHub caducan | Actualizar los 3 secretos AWS antes de cada despliegue; deploy condicionado por `AWS_DEPLOY_ENABLED` |
| Sesión con duración limitada; los recursos se detienen al finalizar | La app no está disponible 24/7 | IP elástica para conservar la dirección; iniciar el lab antes de la demostración |
| Presupuesto de créditos limitado | Riesgo de agotar créditos | Instancias micro, Single-AZ, `99-eliminar-infraestructura.sh` al terminar |
| Registro de dominios no disponible | No se compra el dominio en Route 53 | Registrador externo + Route 53 hosted zone o CNAME |
| Regiones restringidas (habitualmente us-east-1 / us-west-2) | Prefix list y endpoints dependen de la región | La plantilla calcula el DNS del origen según la región; parámetro `CloudFrontPrefixListId` |
| Posible restricción de Secrets Manager | `cfn-lint` sugiere referencias dinámicas (W1011) | Contraseña de RDS como parámetro `NoEcho` y secretos de app en GitHub Secrets |

Si **CloudFront** estuviera bloqueado: servir el frontend con Nginx en la misma EC2 (copiar `frontend/dist` a
`/usr/share/nginx/html` y agregar `location / { try_files $uri /index.html; }`) y usar Let's Encrypt (certbot) con el dominio
para HTTPS. Si **RDS** estuviera bloqueado: MySQL instalado en la EC2 (solo como contingencia; documentar el cambio).

## 9. Costos y limpieza

Las cifras de la propuesta original (USD 43.26/mes) son **estimaciones** y deben recalcularse en
<https://calculator.aws/> antes de citarlas como vigentes. Para no consumir créditos al terminar:

```bash
bash infra/aws/scripts/99-eliminar-infraestructura.sh
```

## 10. Evidencias a capturar

Ver [evidencias-requeridas.md](evidencias-requeridas.md) (consola de cada servicio, stack en `CREATE_COMPLETE`,
app funcionando por HTTPS, health check, ejecución de GitHub Actions).
