# CI/CD con GitHub Actions — explicación de los archivos YAML y sus jobs

> Criterio 5 de la rúbrica. Los fragmentos son copias de los archivos reales del repositorio:
> [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) y [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).
> No existen otros workflows.

**CI (integración continua):** cada cambio se instala, analiza, prueba y compila automáticamente antes de integrarse.
**CD (despliegue continuo):** cuando `main` queda en verde, la versión se publica en AWS de forma repetible, con
aprobación humana y vuelta atrás automática si falla.

![Pipeline CI/CD](../docs/diagramas/05-pipeline-cicd.png)

## 1. Relación con el diagrama de infraestructura

![Arquitectura desplegada](../docs/diagramas/07-arquitectura-aws-desplegada.png)

| Paso del pipeline | Componente de la infraestructura que toca |
|---|---|
| Job `backend` de CI (MySQL 8.4 en contenedor) | Reproduce **RDS MySQL 8.4** para probar migraciones y reglas con una base real |
| Job `infra` de CI (cfn-lint) | Valida la plantilla que crea **VPC, subredes, SG, EC2, IP elástica, RDS y S3** |
| Job *Backend → EC2* de Deploy | Entra por SSH a la **EC2** (IP elástica), escribe `/etc/agenda-facil/api.env`, instala la release, ejecuta **Prisma migrate** contra **RDS** y reinicia el servicio **systemd** detrás de **Nginx** |
| Job *Frontend* de Deploy | Publica `frontend/dist` en la **EC2** y Nginx lo sirve por **HTTPS** (con CloudFront activado, lo sincroniza en **S3** e invalida la caché) |
| Verificación final | Consulta `https://52-54-96-26.sslip.io/api/health`, que a su vez consulta **RDS** |

## 2. Workflow `ci.yml`

### 2.1 Disparadores, permisos y concurrencia

```yaml
on:
  pull_request:
    branches: [develop, main]   # cada PR hacia develop o main
  push:
    branches: [develop, main]   # cada integración en esas ramas
  workflow_dispatch:            # ejecución manual desde la pestaña Actions

permissions:
  contents: read                # el token solo puede leer el código (mínimo privilegio)

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true      # un push nuevo cancela la ejecución anterior de la misma rama
```

### 2.2 Jobs

| Job (nombre visible) | Depende de | Qué hace | Por qué |
|---|---|---|---|
| `backend` — *Backend (lint, build, pruebas)* | — | Levanta un **servicio MySQL 8.4**, `npm ci`, `npm run lint`, `npm run build` (Prisma generate + verificación de módulos) y `npm test` (50 pruebas unitarias y de API) | Las reglas críticas (doble reserva, aislamiento entre negocios, roles) se prueban contra una base real |
| `frontend` — *Frontend (lint, pruebas, build)* | — | `npm ci`, lint, 10 pruebas, `npm run build` y sube `frontend/dist` como **artefacto** | Garantiza que la interfaz compila |
| `infra` — *Infraestructura (CloudFormation, scripts, workflows)* | — | Regenera la plantilla y exige que coincida con la versionada; **cfn-lint**, **ShellCheck** y **actionlint** | Los errores de infraestructura se detectan antes de llegar a AWS |
| `e2e` — *E2E en navegador (flujo MVP)* | `backend`, `frontend` | Levanta MySQL, aplica migraciones, arranca API y frontend, instala Chromium y ejecuta Playwright (18 pasos); guarda capturas como artefacto | Prueba el sistema completo como lo usaría una persona |

Fragmento del job `backend` (servicio de base de datos y pasos):

```yaml
  backend:
    name: Backend (lint, build, pruebas)
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.4                      # misma versión principal que RDS
        env:
          MYSQL_ROOT_PASSWORD: ci_root_password
          MYSQL_DATABASE: agenda_facil_test
        ports: ['3306:3306']
        options: >-
          --health-cmd="mysqladmin ping -h 127.0.0.1 -pci_root_password"
          --health-interval=5s --health-timeout=5s --health-retries=20
    defaults:
      run:
        working-directory: backend
    env:
      # Credenciales efímeras del contenedor de pruebas (no son secretos de producción)
      DATABASE_URL: mysql://root:ci_root_password@127.0.0.1:3306/agenda_facil_test
    steps:
      - uses: actions/checkout@v4             # descarga el código
      - uses: actions/setup-node@v4           # Node 22 con caché de npm
        with: { node-version: 22, cache: npm, cache-dependency-path: backend/package-lock.json }
      - name: Instalar dependencias
        run: npm ci                           # instalación exacta según package-lock.json
      - name: Lint
        run: npm run lint
      - name: Build (Prisma generate + verificación de módulos)
        run: npm run build
      - name: Pruebas unitarias y de API (MySQL 8)
        run: npm test
```

Las pruebas nunca usan la base de producción: `tests/global-setup.js` crea una base temporal
`agenda_facil_test_<marca>` en el MySQL del propio job y la borra al terminar.

Fragmento del job `infra`:

```yaml
      - name: La plantilla generada coincide con su fuente
        run: |
          python3 infra/aws/cloudformation/build-template.py
          git diff --exit-code infra/aws/cloudformation/agenda-facil.yaml
      - name: cfn-lint (errores bloquean; advertencias documentadas se permiten)
        run: cfn-lint --non-zero-exit-code error infra/aws/cloudformation/agenda-facil.yaml
      - name: ShellCheck
        run: shellcheck infra/aws/ec2/*.sh infra/aws/scripts/*.sh scripts/github/*.sh
      - name: actionlint
        run: actionlint -shellcheck=shellcheck .github/workflows/*.yml
```

Fragmento del job `e2e` (dependencias y espera explícita de los servicios):

```yaml
  e2e:
    name: E2E en navegador (flujo MVP)
    needs: [backend, frontend]        # solo corre si los dos anteriores pasaron
    …
      - name: Iniciar servicios
        run: |
          (cd backend && nohup npm start > ../backend.log 2>&1 &)
          (cd frontend && nohup npx vite preview --port 4173 --strictPort > ../frontend.log 2>&1 &)
          for _ in $(seq 1 30); do
            if curl -sf http://localhost:4173/api/health; then exit 0; fi
            sleep 2
          done
          echo "::error::La API o el frontend no iniciaron"; cat backend.log frontend.log
          exit 1
      - name: Ejecutar flujo E2E
        run: BASE_URL=http://localhost:4173 node e2e/mvp-flow.cjs
```

**Reglas de la rama `main`:** solo se integra por Pull Request y exige los 4 checks anteriores en verde
(*Settings → Branches*), sin *force push* ni borrado.

## 3. Workflow `deploy.yml`

### 3.1 Disparadores

```yaml
on:
  workflow_run:
    workflows: [CI]
    types: [completed]
    branches: [main]          # cuando CI termina sobre main
  workflow_dispatch:
    inputs:
      ref:
        description: 'Commit, tag o rama a desplegar (vacío = main). Úsalo para hacer rollback.'

permissions:
  contents: read

concurrency:
  group: deploy-production
  cancel-in-progress: false   # nunca se cancela un despliegue a medias
```

### 3.2 Jobs y dependencias

`authorize` → `backend` → `frontend` (cada uno con `needs:` del anterior).

| Job | Entorno / secretos | Qué hace |
|---|---|---|
| `authorize` — *Autorizar origen del despliegue* | **Ninguno** (no puede leer secretos) | Se ejecuta solo si `AWS_DEPLOY_ENABLED == 'true'` y el CI terminó con éxito por un **push a `main` de este repositorio** (nunca un PR ni un fork), o si es manual desde `main`. Resuelve el commit y comprueba con `git merge-base --is-ancestor` que pertenece a `main` |
| `backend` — *Backend → EC2* | `environment: production` (requiere **aprobación manual**) | Empaqueta `backend/`, escribe `api.env` desde los secretos por **stdin**, copia por `scp` y ejecuta `remote-deploy.sh` en EC2; luego comprueba `/api/health` desde Internet |
| `frontend` — *Frontend → S3 + CloudFront (o EC2)* | `environment: production` | `npm ci` + `npm run build`; si `CLOUDFRONT_DISTRIBUTION_ID` está vacía (caso real) publica `dist` en EC2 con `remote-frontend.sh`; si no, `s3 sync` + invalidación de CloudFront. Verifica que el sitio responde |

Fragmento de `authorize` (condición de seguridad):

```yaml
    if: >-
      vars.AWS_DEPLOY_ENABLED == 'true' &&
      (
        (github.event_name == 'workflow_run' &&
         github.event.workflow_run.conclusion == 'success' &&
         github.event.workflow_run.event == 'push' &&
         github.event.workflow_run.head_branch == 'main' &&
         github.event.workflow_run.head_repository.full_name == github.repository &&
         github.event.workflow_run.repository.full_name == github.repository) ||
        (github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main')
      )
    …
          if ! git merge-base --is-ancestor "$SHA" "$MAIN_SHA"; then
            echo "::error::El commit $SHA no pertenece a main; solo se despliegan commits de main."
            exit 1
          fi
```

Fragmento de `backend` (secretos que nunca aparecen en los logs):

```yaml
  backend:
    name: Backend → EC2
    needs: authorize
    environment: production            # pausa hasta que el revisor aprueba
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ needs.authorize.outputs.sha }}   # el commit validado, no la entrada del usuario
          persist-credentials: false
      - name: Empaquetar backend
        run: |
          git rev-parse --short HEAD > backend/REVISION
          tar --exclude=node_modules --exclude=uploads --exclude=tests --exclude=.env -czf backend.tar.gz backend infra/aws/ec2/remote-deploy.sh infra/aws/ec2/rollback.sh
      - name: Copiar paquete y desplegar
        env:
          PROD_DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
          PROD_JWT_SECRET: ${{ secrets.PROD_JWT_SECRET }}
          …
        run: |
          scp "${SSH_OPTS[@]}" backend.tar.gz "$TARGET:/tmp/backend.tar.gz"
          printf "NODE_ENV=production\n…DATABASE_URL='%s'\nJWT_SECRET='%s'\n…" … \
            | ssh "${SSH_OPTS[@]}" "$TARGET" 'sudo install -m 600 -o agenda -g agenda /dev/stdin /etc/agenda-facil/api.env'
          ssh "${SSH_OPTS[@]}" "$TARGET" '… sudo bash /tmp/agenda-deploy/infra/aws/ec2/remote-deploy.sh /tmp/agenda-deploy/backend'
      - name: Verificar salud de la API
        run: |
          for _ in $(seq 1 10); do curl -sf "$PUBLIC_ORIGIN/api/health" && exit 0; sleep 6; done
          exit 1
```

Lo que hace `remote-deploy.sh` dentro de la EC2: crea `/opt/agenda-facil/releases/<fecha>-<commit>`, ejecuta
`npm ci --omit=dev`, `prisma generate`, **`prisma migrate deploy`** (contra RDS) y el seed de planes; cambia el enlace
`current`, reinicia `agenda-facil-api` y comprueba `http://127.0.0.1:3000/api/health`. Si no responde, **vuelve a la
release anterior** y el job falla. Solo las releases sanas quedan marcadas con `.deploy-ok`.

Fragmento de `frontend` (modo EC2, el que se usa en el Learner Lab):

```yaml
      - name: Publicar en EC2 (sin CloudFront; Nginx sirve el frontend)
        if: vars.CLOUDFRONT_DISTRIBUTION_ID == ''
        run: |
          tar -czf frontend.tar.gz frontend/dist infra/aws/ec2/remote-frontend.sh
          scp "${SSH_OPTS[@]}" frontend.tar.gz "$TARGET:/tmp/frontend.tar.gz"
          ssh "${SSH_OPTS[@]}" "$TARGET" '… sudo bash /tmp/agenda-frontend/infra/aws/ec2/remote-frontend.sh /tmp/agenda-frontend/frontend/dist'
```

### 3.3 Control de la aprobación de producción

- Entorno **`production`** (*Settings → Environments*): **revisor obligatorio** (`dylanfuentes0330`) y
  **solo la rama `main`** puede desplegar.
- Los secretos `EC2_HOST`, `EC2_SSH_KEY`, `PROD_DATABASE_URL` y `PROD_JWT_SECRET` son **secretos del entorno**: solo se
  entregan a un job después de la aprobación.
- Cada job que usa el entorno pide su propia aprobación (en el Deploy #3 se aprobaron *backend* y *frontend*).

### 3.4 Secretos y variables

| Tipo | Nombre | Uso |
|---|---|---|
| Secreto (entorno) | `EC2_HOST`, `EC2_SSH_KEY` | Conexión SSH a la IP elástica |
| Secreto (entorno) | `PROD_DATABASE_URL`, `PROD_JWT_SECRET` | Se escriben en `api.env` (permisos 600) |
| Variable | `AWS_DEPLOY_ENABLED` | Interruptor general del despliegue |
| Variable | `AWS_REGION`, `S3_UPLOADS_BUCKET`, `PUBLIC_ORIGIN`, `TRUST_PROXY` | Configuración de la API y verificación |
| Variable (solo modo CloudFront) | `S3_FRONTEND_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID` | Vacías en el despliegue real |
| Secreto (solo modo CloudFront) | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` | No se usan en el despliegue real |

## 4. Cómo se comprueba el resultado

1. *Actions → Deploy → ejecución* con los 3 jobs en verde
   ([Deploy #3](https://github.com/dylanfuentes0330/agenda-facil/actions/runs/46093645654), captura
   `docs/capturas/github/gh-07-deploy-3-verde.png`).
2. `curl https://52-54-96-26.sslip.io/api/health` → `{"status":"ok","database":"ok","version":"<commit>"}`.
3. `node e2e/verificar-produccion.mjs https://52-54-96-26.sslip.io` (11 comprobaciones) y el E2E con
   `BASE_URL=https://52-54-96-26.sslip.io node e2e/mvp-flow.cjs` (18 pasos).

## 5. Rollback (3 niveles)

1. Automático en el servidor si el health check falla tras activar una release.
2. *Actions → Deploy → Run workflow* con `ref` = commit o tag anterior (debe pertenecer a `main`).
3. Manual en EC2: `sudo bash rollback.sh` (solo releases marcadas como sanas).
Las migraciones no se revierten solas: se diseñan compatibles con la versión anterior.

## 6. Historial real de ejecuciones

| Ejecución | Resultado |
|---|---|
| CI en cada PR (#1–#10) y en cada push a `develop`/`main` | 4 jobs en verde (en la primera ejecución del PR #1 falló el job *Infraestructura*; se corrigió en el mismo PR con el commit `f80fc79`, aviso de ShellCheck) |
| Deploy #1 | Omitido (`AWS_DEPLOY_ENABLED` aún no activado) |
| Deploy #2 (`1bb06cc`) | *authorize* y *backend* en verde; *frontend* publicó pero falló su comprobación final (hallazgo H-19, corregido) |
| Deploy #3 (`6aa1439`) | **3/3 en verde** |
| Deploy #4 (`0697c8e`, solo documentación) | En espera de aprobación (opcional: no cambia el código desplegado) |
