# Modalidad individual: justificación, responsabilidades y evidencias

**Proyecto:** Agenda Fácil · **Institución:** Universidad de la Costa · **Semestre:** cuarto · **Modalidad:** individual
**Estudiante:** [Nombre completo — pendiente] · **Código:** [pendiente] · **Programa:** [pendiente] · **Docente:** [pendiente]
**Repositorio:** <https://github.com/dylanfuentes0330/agenda-facil> (cuenta `dylanfuentes0330`)

## 1. Justificación

La rúbrica del corte 3 está redactada para equipos (colaboradores, mínimo de commits y PR por integrante, aprobación
de PR por otro integrante, sustentación con participación en el equipo). Agenda Fácil se desarrolló **en modalidad
individual**: no hay otros integrantes, por lo que esos criterios no pueden cumplirse literalmente sin crear cuentas
falsas, atribuir trabajo a terceros o fabricar revisiones, y **nada de eso se hizo**. Este documento reúne las evidencias
reales del trabajo y señala qué criterios requieren adaptación o autorización del docente.

## 2. Transparencia sobre la autoría del historial

El proyecto se desarrolló con asistencia de una herramienta de IA (**Claude Code**), dirigida y supervisada por el
estudiante desde su equipo y sus cuentas. El historial de Git lo refleja tal como ocurrió y no se ha modificado:

| Identidad en Git | Commits (todas las ramas) | Qué representa |
|---|---|---|
| `Claude Code (asistente IA)` | 26 | Cambios generados por el asistente durante sesiones de trabajo dirigidas por el estudiante |
| `dylanfuentes0330` | 14 (4 commits de cambios + 10 *merges* de Pull Requests) | Commits hechos desde la cuenta del estudiante e integración de los PR |

- Los **10 Pull Requests** se abrieron desde la cuenta `dylanfuentes0330` (con GitHub CLI durante esas sesiones) y se
  integraron tras pasar el CI.
- Las **aprobaciones de despliegue a producción** del entorno `production` (Deploy #2 y #3) las realizó el estudiante
  personalmente en GitHub: el asistente no puede aprobarlas.
- El estudiante inició el Learner Lab, proporcionó las credenciales temporales y la llave del laboratorio, y decidió
  las acciones con costo.

## 3. Responsabilidades asumidas (todas por el estudiante)

| Área | Trabajo realizado | Evidencia |
|---|---|---|
| Análisis y propuesta | Problema, público objetivo, modelo de negocio y propuesta SaaS (octubre 2026) | `Propuesta de Proyecto SaaS - Agenda Fácil.pdf`; documento APA |
| Frontend | SPA React 19 + Vite: landing, autenticación, reservas, panel del negocio, responsive | `frontend/`, `SUSTENTACION/EXPLICACION_REACT.md`, 10 pruebas, capturas `docs/capturas/` |
| Backend | API REST Express: JWT, roles, Zod, reglas de reservas sin doble reserva, aislamiento por negocio | `backend/src/`, 50 pruebas, `SUSTENTACION/EXPLICACION_BACKEND.md` |
| Base de datos | Modelo Prisma, migraciones, MySQL 8.4 local y en RDS, usuario de aplicación de mínimo privilegio | `backend/prisma/`, diagrama ER `docs/diagramas/04-*`, `crear-usuario-app.sql` |
| Arquitectura | Diseño AWS, adaptación al bloqueo de CloudFront del Learner Lab | `docs/diagramas/07-arquitectura-aws-desplegada.png`, `SUSTENTACION/EXPLICACION_AWS.md` |
| AWS | CloudFormation, EC2, RDS, S3, VPC, IP elástica, Nginx, HTTPS, control de costos | `docs/evidencias/despliegue-aws.md`, `verificacion-servicios.txt` |
| CI/CD | `ci.yml` (4 jobs) y `deploy.yml` (3 jobs) con entorno protegido | `SUSTENTACION/EXPLICACION_CICD.md`, capturas `docs/capturas/github/` |
| Pruebas | Unitarias, API, componentes, E2E local y en producción, verificación técnica | `docs/evidencias/resultado-*.txt/.md`, `verificacion-produccion.txt` |
| Seguridad | Auditoría con 20 hallazgos y correcciones; gestión de secretos | `AUDITORIA_TECNICA.md` |
| Documentación | README, guías, documento APA, material de sustentación | `README.md`, `docs/`, `SUSTENTACION/` |

## 4. Metodología de trabajo

- **Flujo Git:** ramas `feature/*`, `fix/*` y `docs/*` → Pull Request hacia `develop` → CI en verde → *merge* → PR de
  *release* `develop → main` → CI → Deploy con aprobación manual.
- **Convención de commits:** `tipo(área): descripción` (`feat`, `fix`, `docs`, `chore`, `ci`).
- **Calidad:** ningún cambio llega a `main` sin los 4 checks de CI (`main` protegida).
- **Iteración guiada por evidencias:** cada fallo real (p. ej. CloudFront bloqueado, comprobación del frontend en el
  Deploy #2) se registró como hallazgo, se corrigió en una rama propia y se verificó en producción.

## 5. Criterios que requieren adaptación o autorización del docente

| Criterio (rúbrica) | Requisito literal | Situación individual | Propuesta de adaptación |
|---|---|---|---|
| 3. Colaboradores | Todos los integrantes como colaboradores | Único colaborador: `dylanfuentes0330` | Evaluar con el único integrante |
| 3. Commits | Mínimo 8 por integrante | 4 commits de cambios + 10 *merges* con la identidad del estudiante; 26 del asistente de IA (sección 2) | Que el docente decida si cuentan los commits asistidos. Si no, el estudiante debe hacer sus propios commits reales (no se generarán commits artificiales) |
| 3. Ramas | Mínimo una por desarrollador, nomenclatura gitflow | 12 ramas `feature/*`, `fix/*`, `docs/*` + `develop` + `main` | Cumple para un desarrollador |
| 4. Pull Requests | Mínimo 8 por integrante con buena descripción | 10 PR con descripción (5 de trabajo y 5 de *release*) | Cumple en número. Ver sección 2 sobre cómo se abrieron |
| 4. Aprobación por otro integrante | El autor no puede aprobar su propio PR | No hay otro integrante; los PR no tienen revisiones | **Requiere autorización.** Sustitutos: CI obligatorio con 4 checks y aprobación manual del entorno `production` |
| 10. Sustentación | Presencial e individual | **El estudiante no realizará la sustentación presencial** | **Requiere decisión del docente.** Se entregan el documento APA, README, explicaciones técnicas y evidencias para revisión documental. No se presenta como cumplido |
| 10. Participación en el equipo | Aportes y tareas asignadas en el equipo | Todas las responsabilidades fueron del estudiante | Tabla de la sección 3 |

## 6. Mapa de evidencias

| Evidencia | Ubicación |
|---|---|
| Pull Requests, ramas, commits y ejecuciones de CI/CD | `docs/evidencias/evidencias-github.md`, `docs/capturas/github/` |
| Despliegue en AWS (recursos, comandos, costos) | `docs/evidencias/despliegue-aws.md` |
| Aplicación en producción | `docs/capturas/aws/prod-*.png`, `docs/evidencias/resultado-e2e-produccion.md` |
| Pruebas | `docs/evidencias/resultado-pruebas-backend.txt`, `resultado-pruebas-frontend.txt`, `resultado-e2e.md`, `verificacion-produccion.txt` |
| Auditoría y estado | `AUDITORIA_TECNICA.md`, `ESTADO_FINAL.md` |
| Cumplimiento de la rúbrica | `docs/CHECKLIST_RUBRICA_CORTE3.md` |
