# Checklist de cumplimiento — Rúbrica final corte 3 (proyecto individual)

Estados: **Cumple** (verificado) · **Parcial** · **Pendiente (estudiante)** · **Requiere autorización del docente**.
Fecha de revisión: 2026-11-28. Ponderación tomada de la tabla de la rúbrica (total 5,00).

| # | Criterio | Aspecto | Peso | Estado | Evidencia / acción |
|---|---|---|---|---|---|
| 1 | Documento APA | Adaptación al nuevo modelo de arquitectura | 0,15 | **Cumple** | `docs/documento-academico/Agenda_Facil_Documento_APA.docx/.pdf` §8–§9 (propuesta → implementado, CloudFront bloqueado) |
| 1 | Documento APA | Normas APA | 0,15 | **Parcial** | APA 7: portada de estudiante, Times 12, doble espacio, numeración, tablas y figuras con número, título y nota, citas y referencias con sangría francesa; listas de tablas y figuras; sin Nota de aceptación, Dedicatoria, Agradecimientos, Resumen, Abstract ni Recomendaciones. **Falta:** datos de portada (nombre, código, programa, curso, docente, fecha). La plantilla de la UNAD no se pudo descargar (HTTP 403): comparar con ella si el docente exige su formato exacto |
| 2 | Perfil GitHub | Foto, información institucional, intereses, gustos, hobbies, proyectos | 0,15 | **Pendiente (estudiante)** | README preparado en `ENTREGA_FINAL_AGENDA_FACIL/09_EVIDENCIAS_GITHUB/perfil-github/` con instrucciones. Faltan foto, nombre, correo institucional y hobbies (no se inventaron) |
| 3 | Git y colaboración | Todos los colaboradores en el repositorio | 0,15 | **Requiere autorización** | Proyecto individual: único colaborador `dylanfuentes0330` (`docs/MODALIDAD_INDIVIDUAL.md`) |
| 3 | Git y colaboración | Commits (mín. 8 c/u) con buenas prácticas | 0,15 | **Requiere autorización** | 40 commits con convención `tipo(área):`; con la identidad del estudiante: 4 de cambios + 10 *merges*; 26 del asistente de IA. No se generaron commits artificiales |
| 3 | Git y colaboración | Ramas gitflow (mín. 1 c/u) | 0,15 | **Cumple** | `main`, `develop`, 5 `feature/*`, 4 `fix/*`, 3 `docs/*` (`docs/evidencias/evidencias-github.md`) |
| 4 | Pull Requests | Mín. 8 PR con descripciones de calidad | 0,35 | **Cumple** (individual) | 10 PR + el de esta entrega, todos con descripción, CI en verde y *merge* (`evidencias-github.md`) |
| 4 | Pull Requests | Aprobación por otro colaborador | 0,15 | **Requiere autorización** | No existe otro integrante; no se simularon revisiones. Controles sustitutos: 4 checks obligatorios y aprobación manual del entorno `production` |
| 5 | CI/CD y YAML | Comprensión del proceso de despliegue | 0,15 | **Cumple** | `SUSTENTACION/EXPLICACION_CICD.md` §3–§5; Deploy #3 en verde |
| 5 | CI/CD y YAML | Explicación de los YAML y sus jobs | 0,35 | **Cumple** | `SUSTENTACION/EXPLICACION_CICD.md` (fragmentos reales, jobs, dependencias, permisos, aprobación, relación con el diagrama) |
| 6 | Documentación | Instalación, ejecución, compilación y despliegue | 0,20 | **Cumple** | `README.md` (Getting Started, instalación, build, deploy); comprobado en un clon limpio (`docs/evidencias/verificacion-getting-started.txt`) |
| 6 | Documentación | Recursos de apoyo y enlaces | 0,20 | **Cumple** | `README.md` → *Recursos adicionales* |
| 6 | Documentación | Evidencias, capturas, flujo y estructura | 0,20 | **Cumple** | `README.md` (capturas de producción, flujo de funcionamiento, estructura de carpetas) |
| 7 | DNS y acceso SaaS | Dominio personalizado y DNS | 0,15 | **Pendiente (estudiante)** | URL actual `https://52-54-96-26.sslip.io` (HTTPS válido) **no es dominio propio**. Reclamar un dominio del Student Pack y seguir `docs/DOMINIO_PERSONALIZADO.md` (script listo y probado) |
| 7 | DNS y acceso SaaS | Aplicación funcional con control de acceso | 0,35 | **Cumple** | Landing como primera vista; `/panel` → login; API 401/403 (`prod-00`, `prod-18`, `verificacion-produccion.txt`) |
| 8 | React | Explicación de componentes | 0,35 | **Cumple** | `SUSTENTACION/EXPLICACION_REACT.md` |
| 8 | React | Configuración y carpetas (next.config) | 0,35 | **Cumple** | Mismo documento §0: no hay Next.js; `vite.config.js` cumple ese papel; mapa de archivos |
| 9 | AWS | Modelo de infraestructura y configuraciones en AWS Academy | 0,65 | **Cumple** (documental) | `SUSTENTACION/EXPLICACION_AWS.md`, diagrama `07-arquitectura-aws-desplegada`, `docs/evidencias/despliegue-aws.md`. La demostración en la consola requiere iniciar el laboratorio |
| 10 | Sustentación | Evidencia de participación y aportes | 0,15 | **Cumple** (individual) | `docs/MODALIDAD_INDIVIDUAL.md` §3 y §6 |
| 10 | Sustentación | Metodología y tareas asignadas | 0,15 | **Cumple** (individual) | `docs/MODALIDAD_INDIVIDUAL.md` §4 |
| 10 | Sustentación | Comunicación oral, dominio y presentación personal | 0,35 | **No se realizará — requiere decisión del docente** | El estudiante no hará la sustentación presencial. No se presenta como cumplido |

## Pendientes que dependen del estudiante

1. Completar los datos de la portada del documento APA y regenerarlo (`python docs/documento-academico/generar_documento.py`).
2. Reclamar un dominio (GitHub Student Developer Pack) y configurarlo (`docs/DOMINIO_PERSONALIZADO.md`).
3. Completar y publicar el perfil de GitHub (`perfil-github/INSTRUCCIONES.md`).
4. Tomar las capturas de la consola de AWS (`docs/evidencias-requeridas.md`) con el laboratorio iniciado.
5. Presentar al docente la justificación de modalidad individual (`docs/MODALIDAD_INDIVIDUAL.md` §5).
