# ESTADO FINAL — Agenda Fácil

Fecha de corte: **2026-11-28**. Este archivo dice exactamente qué está terminado (y cómo se verificó) y qué
necesita una persona. Clasificación: **COMPLETADA Y VERIFICADA** · **CONFIGURADA PERO NO EJECUTADA** ·
**PENDIENTE DE ACCESO** · **PENDIENTE DE INTERVENCIÓN HUMANA** · **BLOQUEADA**.

**Aplicación en producción: <https://52-54-96-26.sslip.io>** (solo responde con la sesión del Learner Lab iniciada).

## 1. Terminado y verificado

| Elemento | Verificación |
|---|---|
| Frontend React (10 áreas, responsive, en español) | 10 pruebas de componentes; E2E 18/18 en local **y contra la URL pública** |
| API REST (auth, roles, negocio, servicios, horarios, clientes, reservas, panel) | 50 pruebas contra MySQL 8.4; Newman 42 peticiones / 55 aserciones; verificación de producción 11/11 |
| Prevención de doble reserva | 10 reservas simultáneas → 1 confirmada; prueba de mutación; horario ocupado bloqueado en producción |
| Validación anti-amplificación (GHSA-mrhx-c7xc-m3w5) | 30 000 filas → 400 con 244 bytes, en local y en producción (H-16) |
| Repositorio en GitHub | <https://github.com/dylanfuentes0330/agenda-facil>; PR #1–#6 integrados; `main` protegida (PR + 4 checks) |
| CI en GitHub | Backend, frontend, infraestructura (cfn-lint, ShellCheck, actionlint) y E2E en verde en cada PR/push |
| Infraestructura AWS | Stack `agenda-facil` `CREATE_COMPLETE`: VPC, EC2 t3.micro, RDS MySQL 8.4.11 privada Single-AZ cifrada, S3 privado, IP elástica. CloudFront **bloqueado por el Learner Lab** → `EnableCloudFront=false` (H-18) |
| HTTPS | Let's Encrypt en EC2 (vence 2027-02-25, renovación automática), HTTP→HTTPS, HSTS |
| Base de datos en producción | Usuario `agenda_app` con permisos limitados; migración aplicada por el Deploy; lecturas/escrituras reales verificadas |
| Almacenamiento de logos | Subida a S3 + URL prefirmada (200) y acceso sin firma denegado (403) |
| CD (GitHub Actions) | Entorno `production` con revisor obligatorio y solo `main`; **Deploy #3 en verde (3/3 jobs)** con la versión final `6aa1439` |
| Auditoría técnica | `AUDITORIA_TECNICA.md`: H-01…H-20 |
| Evidencias | `docs/evidencias/despliegue-aws.md`, `evidencias-github.md`, `verificacion-getting-started.txt`; 20 capturas de producción en `docs/capturas/aws/` y 10 de GitHub en `docs/capturas/github/` |
| Rúbrica del corte 3 | `docs/CHECKLIST_RUBRICA_CORTE3.md`, `docs/MODALIDAD_INDIVIDUAL.md`, explicaciones de React, CI/CD y AWS en `SUSTENTACION/`, documento APA actualizado (50 páginas, 11 tablas, 26 figuras) |
| Secretos | Ninguno en Git ni en logs; contraseñas de producción solo en el equipo del líder y en secretos del entorno `production` |

## 2. Lo que NO está hecho (y por qué)

| Elemento | Estado | Motivo |
|---|---|---|
| CloudFront | BLOQUEADA | El Learner Lab deniega todas sus acciones; la plantilla lo mantiene con `EnableCloudFront=true` para cuentas que lo permitan |
| Dominio personalizado | PENDIENTE DE INTERVENCIÓN HUMANA | No existe dominio; se usa `sslip.io`. No se compra nada sin autorización |
| Rol IAM de mínimo privilegio | BLOQUEADA | Learner Lab no permite crear roles; se usa `LabInstanceProfile` (documentado) |
| Capturas de la consola de AWS y de GitHub | PENDIENTE DE INTERVENCIÓN HUMANA | Deben tomarse desde las cuentas del equipo (`docs/evidencias-requeridas.md`) |
| Criterios de equipo (colaboradores, aprobación de PR por otro integrante, mínimo de commits propios) | REQUIERE AUTORIZACIÓN DEL DOCENTE | Proyecto individual; ver `docs/MODALIDAD_INDIVIDUAL.md` §5 |
| Sustentación presencial | NO SE REALIZARÁ | Decisión del estudiante; requiere decisión del docente |
| Perfil de GitHub | PENDIENTE DE INTERVENCIÓN HUMANA | README preparado en `ENTREGA_FINAL_AGENDA_FACIL/09_EVIDENCIAS_GITHUB/perfil-github/`; faltan foto y datos personales |
| Portada del documento APA y verificación de referencias | PENDIENTE DE INTERVENCIÓN HUMANA | Nombre, código, programa, curso, docente y fecha |

## 3. Acciones del equipo, en orden de prioridad

### P1. Antes de la demostración (responsable AWS)
1. AWS Academy → Learner Lab → **Start Lab** ~10 minutos antes (EC2 vuelve a arrancar; la IP elástica mantiene la URL).
2. Si RDS se detuvo para ahorrar créditos, iniciarla (tarda ~5 min):

```bash
aws rds start-db-instance --db-instance-identifier agenda-facil-db
```

3. Comprobar `https://52-54-96-26.sslip.io/api/health` → `"database":"ok"`.
4. Después de la demostración, detener RDS para no consumir créditos fuera de la sesión:

```bash
aws rds stop-db-instance --db-instance-identifier agenda-facil-db
```

5. Al cerrar el curso, **si el equipo lo decide**, liberar todo con `99-eliminar-infraestructura.sh` (deja un snapshot de RDS;
acción destructiva que el asistente no ejecutó).

### P2. Aportes individuales (cada integrante) — PENDIENTE DE INTERVENCIÓN HUMANA
Antes: completar perfil (foto, nombre, bio) y configurar Git con el correo de su cuenta:

```bash
git config --global user.email "correo-de-tu-cuenta@ejemplo.com"
```

| Integrante | Rama | Tarea concreta (pequeña, real y verificable) | Comprobación |
|---|---|---|---|
| Frontend | `feature/frontend` | En `frontend/src/pages/business/Dashboard.jsx`, mostrar el teléfono del cliente en “Próximas reservas” | `npm test --prefix frontend` y captura |
| Backend | `feature/backend` | Endpoint `GET /api/business/reservations/export` que devuelva CSV de las citas del rango, con una prueba en `backend/tests/api/` | `npm test --prefix backend` |
| Base de datos | `feature/database` | Migración que agregue un índice útil (p. ej. `clients(business_id, phone)`) con `npm run db:migrate:dev --prefix backend -- --name indice_telefono` | Migración en el PR |
| AWS / DevOps | `feature/aws-deployment` | Tomar las capturas de consola AWS de `docs/evidencias-requeridas.md` (stack, EC2, SG, RDS, S3) en `docs/capturas/aws/` y enlazarlas desde `docs/evidencias/despliegue-aws.md` | Capturas en el PR |
| Documentación | `feature/documentation` | Completar `PORTADA` en `docs/documento-academico/generar_documento.py` y la tabla de integrantes del README; regenerar el documento | DOCX/PDF en el PR |

Flujo para cada uno:

```bash
git checkout develop && git pull && git checkout -b feature/frontend-telefono-proximas
```

```bash
git add -A && git commit -m "feat(frontend): muestra el teléfono del cliente en próximas reservas"
```

```bash
git push -u origin feature/frontend-telefono-proximas
```

Luego en GitHub: *Compare & pull request* → base `develop` → asignar revisor → esperar CI verde → *Merge*.

### P4. Dominio (opcional) — PENDIENTE DE INTERVENCIÓN HUMANA
Despliegue actual sin CloudFront: con el dominio, crear un registro **A** hacia `52.54.96.26`, ejecutar en EC2
`sudo bash configurar-https.sh www.tudominio.com` y actualizar `PUBLIC_ORIGIN`. Los pasos siguientes aplican al modo CloudFront.

1. Obtener un dominio en un registrador (o verificar si el curso/programa estudiantil ofrece uno). **El asistente no compra nada.**
2. *Certificate Manager* (región **N. Virginia / us-east-1**) → *Request* → *Public certificate* → `www.tudominio.com` → *DNS validation* → crear en el DNS del dominio el **CNAME de validación** que muestra ACM.
3. Opción Route 53: *Hosted zones → Create* → copiar los 4 registros **NS** al registrador. Opción sin Route 53: en el registrador crear **CNAME** `www` → `dxxxx.cloudfront.net`.
4. Redesplegar el stack con `DOMAIN_NAME`, `ACM_CERT_ARN` (y `HOSTED_ZONE_ID` si se usa Route 53), actualizar la variable `PUBLIC_ORIGIN` y comprobar:

```bash
nslookup www.tudominio.com
```

```bash
curl -s https://www.tudominio.com/api/health
```

### P5. Documento académico — PENDIENTE DE INTERVENCIÓN HUMANA
1. Completar `PORTADA` en `docs/documento-academico/generar_documento.py` (los campos aparecen resaltados en amarillo en el DOCX).
2. Abrir cada URL de la sección *Referencias* y confirmar que carga (el entorno de desarrollo no tenía acceso a esos sitios).
3. **Ya desplegado**: actualizar la sección 16 con `docs/evidencias/despliegue-aws.md` (URL, recursos, modo sin CloudFront y motivo) y las capturas de `docs/capturas/aws/`, y cambiar el estado de “no desplegado” solo para lo verificado.
4. Recalcular los costos en <https://calculator.aws/> (referencia: tabla de `docs/evidencias/despliegue-aws.md` §6) y añadir el enlace de la estimación (sección 18).
5. Regenerar:

```bash
python3 docs/documento-academico/generar_documento.py
```

### P6. Sustentación — PENDIENTE DE INTERVENCIÓN HUMANA
Repartir `SUSTENTACION/PREGUNTAS_SUSTENTACION.md` entre los integrantes y ensayar `SUSTENTACION/DEMOSTRACION.md` al menos una vez cronometrado.
