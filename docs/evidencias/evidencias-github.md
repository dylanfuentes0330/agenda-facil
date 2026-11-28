# Evidencias de GitHub: ramas, commits, Pull Requests y CI/CD

Datos extraídos con `git` y GitHub CLI el 2026-11-28 del repositorio
<https://github.com/dylanfuentes0330/agenda-facil> (público). Capturas en [`docs/capturas/github/`](../capturas/github/).
Autoría del historial y modalidad individual: [`docs/MODALIDAD_INDIVIDUAL.md`](../MODALIDAD_INDIVIDUAL.md).

## 1. Colaboradores y protecciones

| Elemento | Estado |
|---|---|
| Colaboradores | `dylanfuentes0330` (único; proyecto individual) |
| Rama `main` | Protegida: PR obligatorio, 4 checks de CI requeridos, sin *force push* ni borrado |
| Entorno `production` | Revisor obligatorio (`dylanfuentes0330`), solo la rama `main`, secretos de despliegue del entorno |

## 2. Ramas (nomenclatura gitflow)

`develop` `docs/deploy-verde` `docs/despliegue-aws-final` `feature/aws-deployment` `feature/backend` `feature/database` `feature/documentation` `feature/frontend` `fix/auditoria-final` `fix/aws-deploy-security-mysql84` `fix/aws-learner-lab-sin-cloudfront` `fix/backend-validation-amplification` `main` 

- `main`: versión en producción. `develop`: integración.
- `feature/*`: funcionalidades por área (backend, frontend, base de datos, AWS, documentación).
- `fix/*`: correcciones (auditoría, seguridad de despliegue, validación, Learner Lab sin CloudFront).
- `docs/*`: documentación y evidencias.

Captura: `docs/capturas/github/gh-04-ramas.png`.

## 3. Commits

- Convención: `tipo(área): descripción` (`feat`, `fix`, `docs`, `chore`, `ci`), en español, en imperativo/descriptivo.
- Ejemplos reales: `feat(infra): modo sin CloudFront para Learner Labs que lo bloquean`,
  `fix(backend): limitar la amplificación de errores de validación (GHSA-mrhx-c7xc-m3w5)`,
  `fix(deploy): comprobar el frontend también por HTTPS y publicar la versión en /api/health`.
- Totales en todas las ramas: 26 commits de `Claude Code (asistente IA)` y 14 de `dylanfuentes0330`
  (4 de cambios y 10 *merges* de PR). Ver la explicación en `MODALIDAD_INDIVIDUAL.md` §2.

Captura: `docs/capturas/github/gh-05-commits-main.png`.

## 4. Pull Requests

Todos abiertos desde la cuenta `dylanfuentes0330`, con descripción (resumen, cambios y verificación), CI en verde antes
del *merge* e integrados con *merge commit*. **Ninguno tiene revisión de otra persona** (no hay otros integrantes).

| PR | Rama → base | Título | Cambios | Integrado |
|---|---|---|---|---|
| [#1](https://github.com/dylanfuentes0330/agenda-facil/pull/1) | `fix/auditoria-final` → `develop` | Fix/auditoria final | +1336 / −146 · 56 archivos | 2026-11-27 |
| [#2](https://github.com/dylanfuentes0330/agenda-facil/pull/2) | `fix/aws-deploy-security-mysql84` → `develop` | fix(deploy): bloquear despliegues desde forks y migrar RDS a MySQL 8.4 | +99 / −15 · 8 archivos | 2026-11-27 |
| [#3](https://github.com/dylanfuentes0330/agenda-facil/pull/3) | `fix/backend-validation-amplification` → `develop` | fix(backend): limitar la amplificación de errores de validación (GHSA-mrhx-c7xc-m3w5) | +50 / −4 · 4 archivos | 2026-11-28 |
| [#4](https://github.com/dylanfuentes0330/agenda-facil/pull/4) | `develop` → `main` | Release: integra develop en main (auditoría, seguridad de despliegue, MySQL 8.4, validación) | +1482 / −162 · 60 archivos | 2026-11-28 |
| [#5](https://github.com/dylanfuentes0330/agenda-facil/pull/5) | `fix/aws-learner-lab-sin-cloudfront` → `develop` | feat(infra): despliegue en Learner Lab sin CloudFront (bloqueado en esta cuenta) | +286 / −34 · 9 archivos | 2026-11-28 |
| [#6](https://github.com/dylanfuentes0330/agenda-facil/pull/6) | `develop` → `main` | Release: despliegue en Learner Lab sin CloudFront (EC2 + Nginx + Let's Encrypt) | +286 / −34 · 9 archivos | 2026-11-28 |
| [#7](https://github.com/dylanfuentes0330/agenda-facil/pull/7) | `docs/despliegue-aws-final` → `develop` | docs+fix: despliegue real en AWS, evidencias y comprobación HTTPS del frontend | +420 / −154 · 36 archivos | 2026-11-28 |
| [#8](https://github.com/dylanfuentes0330/agenda-facil/pull/8) | `develop` → `main` | Release final: evidencias de producción y despliegue del frontend en verde | +420 / −154 · 36 archivos | 2026-11-28 |
| [#9](https://github.com/dylanfuentes0330/agenda-facil/pull/9) | `docs/deploy-verde` → `develop` | docs: Deploy #3 en verde con la versión final | +13 / −11 · 7 archivos | 2026-11-28 |
| [#10](https://github.com/dylanfuentes0330/agenda-facil/pull/10) | `develop` → `main` | docs: Deploy #3 en verde con la versión final | +13 / −11 · 7 archivos | 2026-11-28 |

Capturas: `gh-02-pull-requests-cerrados.png`, `gh-03-pr-5-sin-cloudfront.png`.

## 5. GitHub Actions

| Workflow | Ejecuciones (últimas 60) | Éxito | Fallo | Omitidas |
|---|---|---|---|---|
| CI | 22 | 21 | 1 | 0 |
| Deploy | 4 | 1 | 1 | 1 |

- Fallos explicados: CI del PR #1 (job *Infraestructura*, corregido en el mismo PR) y Deploy #2 (comprobación final del
  frontend, hallazgo H-19, corregido; Deploy #3 en verde).
- [Deploy #3](https://github.com/dylanfuentes0330/agenda-facil/actions/runs/46093645654): 3/3 jobs en verde, aprobado
  en el entorno `production` (captura `gh-07-deploy-3-verde.png`).
- CI de `main` tras la *release* final: [46094490347](https://github.com/dylanfuentes0330/agenda-facil/actions/runs/46094490347)
  (captura `gh-08-ci-main.png`).
