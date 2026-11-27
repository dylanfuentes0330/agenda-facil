# Guía de contribución — Agenda Fácil

## Flujo de ramas

| Rama | Propósito | Quién integra |
|---|---|---|
| `main` | Producción. Cada merge despliega a AWS (si `AWS_DEPLOY_ENABLED=true`). | Solo PR desde `develop`, con 1 aprobación y CI en verde |
| `develop` | Integración de funcionalidades | PR desde ramas `feature/*`, con CI en verde |
| `feature/frontend` | Interfaz React | Responsable de frontend |
| `feature/backend` | API Express | Responsable de backend |
| `feature/database` | Esquema Prisma, migraciones | Responsable de base de datos |
| `feature/aws-deployment` | CloudFormation, scripts, workflows | Responsable de AWS / DevOps |
| `feature/documentation` | README, documento APA, guías | Responsable de documentación |

Para tareas pequeñas se pueden crear ramas cortas: `feature/<area>-<tema>` (p. ej. `feature/frontend-filtros-citas`)
o `fix/<tema>`.

## Paso a paso para cada aporte

```bash
git checkout develop && git pull
```

```bash
git checkout -b feature/frontend-mi-cambio
```

```bash
npm run lint && npm test
```

```bash
git add -A && git commit -m "feat(frontend): agrega filtro por servicio en la agenda"
```

```bash
git push -u origin feature/frontend-mi-cambio
```

Luego abre un Pull Request hacia `develop` en GitHub, completa la plantilla y solicita revisión a otro integrante.

## Convención de commits (Conventional Commits)

`tipo(área): descripción en imperativo`

- Tipos: `feat`, `fix`, `docs`, `test`, `refactor`, `style`, `ci`, `infra`, `chore`.
- Áreas: `frontend`, `backend`, `db`, `aws`, `ci`, `docs`.
- Ejemplos: `fix(backend): valida margen de cancelación`, `docs: actualiza guía de AWS`.

## Revisión de Pull Requests

- Mínimo **1 aprobación** de otro integrante.
- CI en verde (lint, pruebas, build, E2E).
- Sin secretos ni archivos `.env` en el diff.
- Se prefiere *Squash and merge* hacia `develop` y *Merge commit* de `develop` a `main` (release).

## Reglas de seguridad

- Nunca subir contraseñas, claves de AWS, `labsuser.pem` ni archivos `.env`.
- Las credenciales van en **GitHub → Settings → Secrets and variables → Actions**.
- Si se sube un secreto por error: revocarlo/rotarlo inmediatamente (borrar el commit no basta).
