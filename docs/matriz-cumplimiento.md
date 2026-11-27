# Matriz de cumplimiento de requisitos académicos

> **Importante:** no se recibió la rúbrica oficial de evaluación. Esta matriz relaciona los **objetivos académicos
> indicados en el enunciado del proyecto** con evidencias concretas. Cuando el equipo disponga de la rúbrica,
> debe contrastarla con esta tabla y ajustar los criterios.

Estados: **COMPLETADO** · **PARCIAL** · **PENDIENTE** · **BLOQUEADO**

| # | Requisito académico | Estado | Evidencia concreta | Acción pendiente (equipo) |
|---|---|---|---|---|
| 1 | Documento actualizado con arquitectura y normas APA 7 | PARCIAL | `ENTREGA_FINAL/01_Documento_Academico/Agenda_Facil_Documento_APA.docx` y `.pdf` | Completar portada (integrantes, docente, curso), insertar capturas de AWS, verificar cada enlace de referencias |
| 2 | Perfiles personales de GitHub completos | PENDIENTE | Guía: `docs/guia-git-github.md` §1 | Cada integrante completa su perfil y toma captura |
| 3 | Trabajo colaborativo: commits, ramas y Pull Requests | PARCIAL | Repositorio con `main`, `develop` y 5 ramas `feature/*`; plantillas de PR/issues; `CONTRIBUTING.md` | Publicar en GitHub; cada integrante hace commits y PRs propios (el historial inicial fue generado con IA y así está identificado) |
| 4 | Configuración y comprensión de CI/CD | PARCIAL | `.github/workflows/ci.yml`, `deploy.yml`; comandos ejecutados localmente con éxito; diagrama `05-pipeline-cicd.png` | Primera ejecución real en GitHub Actions y captura; configurar secretos para Deploy |
| 5 | Documentación técnica en README.md | COMPLETADO | `README.md` (instalación, variables, migraciones, pruebas, API, AWS, CI/CD, dominio, capturas, estado) | Completar tabla de integrantes y badge `OWNER/REPO` |
| 6 | Aplicación funcional | COMPLETADO (local) | 46 pruebas backend, 10 frontend, E2E 18/18, Newman 55 aserciones; capturas en `docs/capturas` | — |
| 7 | Aplicación desplegada en AWS | PENDIENTE | Plantilla CloudFormation validada (`cfn-lint`), scripts y guía `docs/guia-aws-academy.md` | Ejecutar el despliegue en Learner Lab y capturar evidencias |
| 8 | Accesible mediante dominio personalizado | PENDIENTE | Parámetros `DomainName`/`AcmCertificateArn`/`HostedZoneId`; guía §7 | Adquirir dominio, emitir certificado ACM, configurar DNS |
| 9 | Comprensión de React | COMPLETADO | Frontend React 19 (componentes reutilizables, contextos, rutas protegidas, hooks); sección del documento | Preparar explicación oral |
| 10 | Comprensión de configuraciones (variables, Vite, Express, Prisma, Nginx, systemd) | COMPLETADO | `.env.example`, `vite.config.js`, `app.js`, `schema.prisma`, `bootstrap-ec2.sh` | — |
| 11 | Comprensión de la arquitectura AWS Academy | PARCIAL | `docs/arquitectura.md`, diagrama `01-arquitectura-aws.png`, limitaciones documentadas | Validar en el laboratorio real las limitaciones listadas |
| 12 | Uso de los servicios propuestos (EC2, RDS, S3, CloudFront, Route 53, IAM) | PARCIAL | Todos definidos en la plantilla; S3 integrado en el código (logos) | Desplegar; IAM de mínimo privilegio solo aplicable fuera de Learner Lab |
| 13 | Funcionalidades del negocio (7) | COMPLETADO | `docs/arquitectura.md` RF-01 a RF-07; E2E | — |
| 14 | Funcionalidades del cliente (5) | COMPLETADO | RF-08 a RF-12; E2E | — |
| 15 | Prevención de reservas duplicadas | COMPLETADO | Transacción + `FOR UPDATE`; prueba de 10 peticiones concurrentes; prueba de mutación | — |
| 16 | Aislamiento multi-tenant | COMPLETADO | `backend/tests/api/isolation.test.js`; carpeta 5 de Postman | — |
| 17 | Seguridad (hash, validación, roles, rate limit, secretos, HTTPS, RDS/S3 privados) | PARCIAL | Implementado y probado en código; HTTPS/RDS/S3 definidos en la plantilla | Verificar en AWS desplegado |
| 18 | Modelo de negocio (planes y prueba gratuita, sin cobros simulados) | COMPLETADO | Tabla `plans`, límites aplicados, `trialEndsAt`; pruebas de límite de plan | Definir precios reales si el curso lo requiere |
| 19 | Pruebas y colección Postman | COMPLETADO | `docs/evidencias/*`, `docs/postman/*` | — |
| 20 | Análisis de costos | PARCIAL | Sección del documento con la estimación original identificada como tal | Recalcular en AWS Pricing Calculator y adjuntar enlace/captura |
