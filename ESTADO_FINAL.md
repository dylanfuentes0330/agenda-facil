# ESTADO FINAL — Agenda Fácil

Fecha de corte: **2026-11-27**. Este archivo dice exactamente qué está terminado (y cómo se verificó) y qué
necesita una persona. Clasificación: **COMPLETADA Y VERIFICADA** · **CONFIGURADA PERO NO EJECUTADA** ·
**PENDIENTE DE ACCESO** · **PENDIENTE DE INTERVENCIÓN HUMANA** · **BLOQUEADA**.

## 1. Terminado y verificado

| Elemento | Verificación |
|---|---|
| Frontend React (10 áreas, responsive, en español) | 10 pruebas de componentes; E2E 18/18 en Chromium; sin desbordamiento en móvil/tablet/escritorio |
| API REST (auth, roles, negocio, servicios, horarios, clientes, reservas, panel) | 48 pruebas contra MySQL 8; Newman 42 peticiones / 55 aserciones |
| Prevención de doble reserva | 10 reservas simultáneas → 1 confirmada; sin el bloqueo → 9 duplicadas (prueba de mutación) |
| Aislamiento entre negocios | 6 pruebas dedicadas + carpeta 5 de Postman |
| Base de datos (modelo, migración, seed de planes) | Migración aplicada sobre BD vacía en la simulación de despliegue |
| Scripts de despliegue y rollback de EC2 | Simulación local de 5 escenarios (`docs/evidencias/simulacion-despliegue-ec2.md`) |
| Plantilla CloudFormation | cfn-lint: 0 errores (1 advertencia documentada) |
| Workflows de GitHub Actions | actionlint: 0 hallazgos; comandos de CI ejecutados en clon limpio |
| Auditoría técnica | `AUDITORIA_TECNICA.md`: 15 hallazgos, 13 corregidos y verificados, 2 aceptados/pendientes justificados |
| Documentación | README, guías Git/AWS, arquitectura, diagramas, documento APA (DOCX/PDF) regenerado y contrastado con el código |
| Material de sustentación | `SUSTENTACION/` (presentación, React, backend, AWS, CI/CD, 38 preguntas, guion de demo) |
| Secretos | Escaneo de todo el historial Git: sin credenciales reales |

## 2. Lo que NO está hecho (y por qué)

| Elemento | Estado | Motivo |
|---|---|---|
| Repositorio en GitHub | PENDIENTE DE ACCESO | El repositorio **`dylanfuentes0330/agenda-facil` ya existe y está vacío** (verificado con `git ls-remote`). Desde esta sesión el push fue rechazado (HTTP 403: la instalación de la Claude GitHub App de la sesión no cubre el repositorio, incluso tras ajustar permisos). Se publica desde el equipo de la persona líder (P1) |
| Ejecución real de CI en GitHub | PENDIENTE DE ACCESO | Depende del repositorio publicado |
| Commits y Pull Requests de integrantes | PENDIENTE DE INTERVENCIÓN HUMANA | Solo pueden hacerlos los integrantes desde sus cuentas |
| Despliegue en AWS | PENDIENTE DE ACCESO | No hay sesión de AWS Academy ni autorización de uso de créditos |
| Dominio personalizado | PENDIENTE DE INTERVENCIÓN HUMANA | No existe dominio; no se compra nada sin autorización |
| Rol IAM de mínimo privilegio | BLOQUEADA | Learner Lab no permite crear roles; se usa `LabInstanceProfile` (documentado) |
| Portada del documento, integrantes, capturas de AWS, verificación de referencias | PENDIENTE DE INTERVENCIÓN HUMANA | Datos personales y evidencias que solo el equipo tiene |

## 3. Acciones del equipo, en orden de prioridad

### P1. Publicar el repositorio (líder) — PENDIENTE DE ACCESO
1. El repositorio vacío **ya existe**: <https://github.com/dylanfuentes0330/agenda-facil>. Verificar que sea **Public** (*Settings → General → Danger Zone → Change visibility*), necesario para proteger ramas en cuentas gratuitas.
2. En el equipo de la persona líder, con [GitHub CLI](https://cli.github.com/) instalado:

```bash
gh auth login
```

```bash
git clone ENTREGA_FINAL/02_CODIGO_FUENTE/agenda-facil-repositorio.bundle agenda-facil
```

```bash
cd agenda-facil && for b in $(git for-each-ref --format='%(refname:lstrip=3)' refs/remotes/origin | grep -v '^HEAD$'); do git show-ref -q --heads "$b" || git branch --track "$b" "origin/$b"; done && git remote remove origin
```

```bash
bash scripts/github/publicar-en-github.sh dylanfuentes0330 agenda-facil public
```

3. *Settings → Collaborators → Add people*: invitar a cada integrante (cada uno acepta desde su correo o <https://github.com/notifications>).
4. *Pull requests → New pull request*: base `develop` ← compare `fix/auditoria-final` → *Create pull request*. Esto ejecuta el CI real. Pedir a otro integrante que lo revise y apruebe; luego *Merge*. Después PR `develop → main`.
5. Captura de *Actions* con los 4 jobs en verde. Si algo falla, copiar el log del job fallido para corregirlo.

> Alternativa: iniciar una **nueva** sesión de Claude Code con el repositorio `dylanfuentes0330/agenda-facil`
> seleccionado (tras instalar la Claude GitHub App en él desde <https://github.com/apps/claude/installations/select_target>)
> y pedir que publique el bundle y ejecute el CI.

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
| AWS / DevOps | `feature/aws-deployment` | Ejecutar `00-verificar-servicios.sh` y subir `docs/evidencias/verificacion-servicios.txt`; actualizar `docs/guia-aws-academy.md` con lo observado | Archivo en el PR |
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

### P3. AWS Academy (responsable AWS) — PENDIENTE DE ACCESO
1. AWS Academy → curso → *Learner Lab* → **Start Lab** → *AWS Details* → copiar credenciales y descargar `labsuser.pem`.
2. Confirmar créditos disponibles en la parte superior del laboratorio (el stack usa EC2 t3.micro, RDS db.t3.micro, CloudFront y S3).
3. Verificar servicios (solo lectura, sin costo):

```bash
bash infra/aws/scripts/00-verificar-servicios.sh
```

4. Si todo aparece `[OK]`, desplegar (crea recursos con costo en créditos):

```bash
export DB_MASTER_PASSWORD='Elige_Una_Clave_2026' && bash infra/aws/scripts/01-desplegar-infraestructura.sh
```

5. Crear el usuario de aplicación en RDS desde EC2 (guía §4) y configurar secretos/variables de GitHub (guía §5).
6. *Settings → Secrets and variables → Actions → Variables → New*: `AWS_DEPLOY_ENABLED` = `true`; luego *Actions → Deploy → Run workflow*.
7. Verificar `https://<CloudFrontUrl>/api/health` y tomar capturas (`docs/evidencias-requeridas.md`).
8. Después de la sustentación, **si el equipo lo decide**, liberar créditos con `99-eliminar-infraestructura.sh` (acción destructiva; el asistente no la ejecutó).

### P4. Dominio — PENDIENTE DE INTERVENCIÓN HUMANA
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
3. Si se desplegó: agregar capturas reales de AWS en la sección 16 y cambiar el estado de “no desplegado” solo para lo que se haya verificado.
4. Recalcular los costos en <https://calculator.aws/> y añadir el enlace de la estimación (sección 18).
5. Regenerar:

```bash
python3 docs/documento-academico/generar_documento.py
```

### P6. Sustentación — PENDIENTE DE INTERVENCIÓN HUMANA
Repartir `SUSTENTACION/PREGUNTAS_SUSTENTACION.md` entre los integrantes y ensayar `SUSTENTACION/DEMOSTRACION.md` al menos una vez cronometrado.
