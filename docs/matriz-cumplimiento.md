# Matriz de cumplimiento (rúbrica)

> **No se pudo verificar la rúbrica oficial:** no se adjuntó ningún archivo de rúbrica (el único adjunto disponible es la
> propuesta original). Los criterios provienen del **objetivo académico del enunciado del proyecto**. Al recibir la
> rúbrica oficial, contrastar criterio por criterio y ajustar esta tabla.
>
> Estados: **COMPLETADA Y VERIFICADA** · **CONFIGURADA PERO NO EJECUTADA** · **PENDIENTE DE ACCESO** ·
> **PENDIENTE DE INTERVENCIÓN HUMANA** · **BLOQUEADA**. Fecha de corte: 2026-11-27.

| Criterio | Evidencia | Estado | Pendiente |
|---|---|---|---|
| Documento actualizado con arquitectura | `docs/documento-academico/Agenda_Facil_Documento_APA.docx` y `.pdf` (21 secciones + anexo, 9 tablas, 19 figuras) contrastado con el código | COMPLETADA Y VERIFICADA (contenido técnico) | — |
| Normas APA 7 en el documento | Portada, numeración, títulos por nivel, tablas/figuras APA, referencias con sangría francesa; verificación automática de numeración y citas | PENDIENTE DE INTERVENCIÓN HUMANA | Completar portada (integrantes, curso, docente, fecha) y verificar cada enlace de referencias |
| Perfiles personales de GitHub completos | Guía `docs/guia-git-github.md` §1 | PENDIENTE DE INTERVENCIÓN HUMANA | Cada integrante completa su perfil y toma captura |
| Trabajo colaborativo: commits | Historial con autor “Claude Code (asistente IA)” (no acredita a integrantes) | PENDIENTE DE INTERVENCIÓN HUMANA | Commits propios de cada integrante (tareas en `ESTADO_FINAL.md`) |
| Trabajo colaborativo: ramas | `main`, `develop`, 5 `feature/*`, `fix/auditoria-final` (local) | CONFIGURADA PERO NO EJECUTADA | Publicar en GitHub |
| Trabajo colaborativo: Pull Requests | Plantilla de PR, protección de ramas por script | PENDIENTE DE ACCESO | Repositorio en GitHub; PRs abiertos y revisados por integrantes |
| Configuración de CI/CD | `ci.yml` (4 jobs), `deploy.yml` (con rollback); actionlint 0 hallazgos; comandos ejecutados en clon limpio | CONFIGURADA PERO NO EJECUTADA | Primera ejecución en GitHub Actions y captura |
| Comprensión de CI/CD | `SUSTENTACION/EXPLICACION_CICD.md`, preguntas 31–35 | COMPLETADA Y VERIFICADA (material) | Ensayar la explicación |
| Documentación técnica en README.md | `README.md` contrastado con el código en la auditoría | COMPLETADA Y VERIFICADA | Completar tabla de integrantes y `OWNER/REPO` |
| Aplicación funcional | 48 + 10 pruebas, E2E 18/18, Newman 55/55, re-ejecutadas en la auditoría (`docs/evidencias/`) | COMPLETADA Y VERIFICADA (entorno local) | — |
| Aplicación desplegada en AWS | CloudFormation validada; scripts de despliegue/rollback ensayados en simulación (5/5) | PENDIENTE DE ACCESO | Learner Lab activo y autorización de uso de créditos |
| Acceso mediante dominio personalizado | Parámetros `DomainName`/`AcmCertificateArn`/`HostedZoneId`, guía §7 | PENDIENTE DE INTERVENCIÓN HUMANA | Obtener dominio (sin compra por parte del asistente), certificado ACM y DNS |
| Comprensión de React | Código + `SUSTENTACION/EXPLICACION_REACT.md` + preguntas 5–9 | COMPLETADA Y VERIFICADA (material) | Ensayar |
| Comprensión de configuraciones | `.env.example`, `vite.config.js`, `app.js`, `schema.prisma`, `bootstrap-ec2.sh` explicados en `SUSTENTACION/` | COMPLETADA Y VERIFICADA (material) | Ensayar |
| Comprensión de la arquitectura AWS Academy | `SUSTENTACION/EXPLICACION_AWS.md`, diagramas, limitaciones | COMPLETADA Y VERIFICADA (material) | Confirmar limitaciones en el laboratorio real |
| Servicios propuestos: EC2, RDS, S3, CloudFront, Route 53, IAM | Definidos en la plantilla; S3 integrado en el código | CONFIGURADA PERO NO EJECUTADA | Desplegar; el rol IAM de mínimo privilegio es BLOQUEADA en Learner Lab (documentado) |
| Funcionalidades del negocio (7) y del cliente (5) | E2E + pruebas de API | COMPLETADA Y VERIFICADA (local) | — |
| Prevención de reservas duplicadas | Prueba de 10 peticiones concurrentes + prueba de mutación | COMPLETADA Y VERIFICADA | — |
| Aislamiento multi-tenant | 6 pruebas + Postman carpeta 5 | COMPLETADA Y VERIFICADA | — |
| Seguridad | Pruebas de API; auditoría (`AUDITORIA_TECNICA.md`) | COMPLETADA Y VERIFICADA en código; CONFIGURADA PERO NO EJECUTADA en AWS | Verificar HTTPS/RDS/S3 privados tras desplegar |
| Pruebas y colección Postman | `docs/evidencias/`, `docs/postman/` | COMPLETADA Y VERIFICADA | Ejecutar Newman contra producción tras desplegar |
| Análisis de costos | Sección 18 del documento (estimación original identificada como tal) | PENDIENTE DE INTERVENCIÓN HUMANA | Recalcular en AWS Pricing Calculator |
| Material de sustentación | `SUSTENTACION/` (7 archivos, 38 preguntas) | COMPLETADA Y VERIFICADA | Ensayar la demostración |
