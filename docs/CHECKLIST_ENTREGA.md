# CHECKLIST DE ENTREGA — Agenda Fácil

Fecha de corte: 2026-11-28. Estados: **COMPLETADO** · **PARCIAL** · **PENDIENTE** · **BLOQUEADO**.
“Equipo” = requiere intervención humana desde cuentas personales o de AWS.

## 1. Análisis y planificación
| Tarea | Estado | Evidencia |
|---|---|---|
| Lectura de la propuesta original (PDF) | COMPLETADO | `docs/arquitectura.md` §1 |
| Requisitos funcionales y no funcionales | COMPLETADO | `docs/arquitectura.md` §1, documento APA §6 |
| Tecnologías seleccionadas y justificadas | COMPLETADO | README “Tecnologías”, `docs/arquitectura.md` §2 |
| Recursos que requieren configuración manual identificados | COMPLETADO | `docs/guia-aws-academy.md`, sección final de este archivo |
| Matriz de cumplimiento | COMPLETADO | `docs/matriz-cumplimiento.md` (sin rúbrica oficial disponible) |

## 2. Arquitectura y diseño
| Tarea | Estado | Evidencia |
|---|---|---|
| Diagrama de arquitectura AWS | COMPLETADO | `docs/diagramas/01-arquitectura-aws.png` |
| Diagrama de componentes | COMPLETADO | `docs/diagramas/02-componentes.png` |
| Diagrama de flujo de reservas | COMPLETADO | `docs/diagramas/03-flujo-reservas.png` |
| Modelo entidad-relación | COMPLETADO | `docs/diagramas/04-modelo-entidad-relacion.png` |
| Estructura de carpetas | COMPLETADO | README |

## 3–5. Desarrollo (frontend, backend, SaaS)
| Tarea | Estado | Evidencia |
|---|---|---|
| 10 áreas del frontend, responsive, en español, sin botones decorativos | COMPLETADO | `frontend/src/pages`, E2E 18/18 |
| API REST completa con roles, validación, errores, CORS, rate limit | COMPLETADO | `backend/src`, 50 pruebas |
| Modelo de datos, migraciones, seed de planes, datos DEMO opcionales | COMPLETADO | `backend/prisma` |
| Prevención de doble reserva (transacción + bloqueo) | COMPLETADO | prueba de concurrencia + prueba de mutación |
| Aislamiento multi-tenant | COMPLETADO | `backend/tests/api/isolation.test.js` |
| Flujo MVP de 9 pasos | COMPLETADO | `docs/evidencias/resultado-e2e.md` |
| Planes Básico/Profesional sin cobros simulados | COMPLETADO | tabla `plans`, límites probados |
| Múltiples usuarios por negocio (Plan Profesional) | PENDIENTE | Mejora futura documentada |

## 6. Seguridad
| Tarea | Estado | Evidencia |
|---|---|---|
| Hash, validación, SQLi, rutas protegidas, roles, multi-tenant, rate limit | COMPLETADO | Pruebas y `docs/arquitectura.md` §4 |
| Secretos fuera de GitHub | COMPLETADO | `.gitignore`, GitHub Secrets en `deploy.yml` |
| HTTPS, RDS privada, S3 privado, IAM mínimo privilegio | PARCIAL | HTTPS (Let's Encrypt), RDS privada y S3 privado **desplegados y verificados**; IAM de mínimo privilegio no aplicable en Learner Lab (`LabInstanceProfile`) |

## 7. Git y GitHub
| Tarea | Estado | Evidencia |
|---|---|---|
| Repositorio local con `main`, `develop`, 5 ramas `feature/*`, tag `v1.0.0-mvp` | COMPLETADO | `git branch -a`, `git log --graph` |
| `.gitignore`, README, CONTRIBUTING, LICENSE, plantillas PR/issues, Dependabot | COMPLETADO | Raíz y `.github/` |
| Publicar en GitHub | COMPLETADO | <https://github.com/dylanfuentes0330/agenda-facil> (`main` protegida) |
| Perfiles completos, commits y PRs de cada integrante | PENDIENTE (Equipo) | `docs/guia-git-github.md` |

## 8. CI/CD
| Tarea | Estado | Evidencia |
|---|---|---|
| Workflow CI (lint, pruebas, build, E2E) | PARCIAL | `ci.yml`; comandos ejecutados en clon limpio; sin ejecución en GitHub aún |
| Workflow Deploy con secretos, condiciones y rollback | COMPLETADO | Ejecutado contra AWS con entorno `production` protegido; ver `docs/evidencias/despliegue-aws.md` §4 |
| Evidencia de pipeline en verde | PARCIAL | CI y Deploy #3 en verde en GitHub (enlaces en `docs/evidencias/despliegue-aws.md`); falta la captura de pantalla |

## 9–10. AWS Academy y dominio
| Tarea | Estado | Evidencia |
|---|---|---|
| Plantilla CloudFormation (EC2, RDS, S3, CloudFront, Route 53) | COMPLETADO | Validada con `cfn-lint` (0 errores) |
| Scripts de verificación, despliegue, publicación y limpieza | COMPLETADO | `infra/aws/scripts`, ShellCheck sin hallazgos |
| Verificar servicios permitidos en el Learner Lab | COMPLETADO | `docs/evidencias/verificacion-servicios.txt` (CloudFront bloqueado) |
| Desplegar infraestructura y aplicación | COMPLETADO | <https://52-54-96-26.sslip.io> — `docs/evidencias/despliegue-aws.md` |
| Dominio personalizado + certificado ACM | PENDIENTE (Equipo) | Sin dominio propio: se usa `sslip.io` con certificado de Let's Encrypt. Guía §7–8 |

## 11. Pruebas
| Tarea | Estado | Evidencia |
|---|---|---|
| Backend 50/50, frontend 10/10, E2E 18/18, Newman 55/55 | COMPLETADO | `docs/evidencias/` |
| Diseño responsive verificado (móvil, tablet, escritorio) | COMPLETADO | E2E sin desbordamiento + capturas |
| Colección Postman | COMPLETADO | `docs/postman/` |
| Pruebas sobre el entorno desplegado | COMPLETADO | E2E 18/18 y `e2e/verificar-produccion.mjs` 11/11 contra la URL pública |

## 12–13. Documentación
| Tarea | Estado | Evidencia |
|---|---|---|
| Documento académico APA 7 (DOCX y PDF, 22 secciones + anexo) | PARCIAL | `docs/documento-academico/`; faltan datos de portada y capturas AWS |
| README profesional | COMPLETADO | `README.md` (falta completar integrantes y OWNER/REPO) |
| Verificar cada enlace de las referencias y la fecha de consulta | PENDIENTE (Equipo) | Los enlaces no pudieron abrirse desde el entorno de desarrollo (red restringida) |

## 14. Entrega
| Tarea | Estado | Evidencia |
|---|---|---|
| Carpeta ENTREGA_FINAL con los 12 elementos | COMPLETADO | `ENTREGA_FINAL/` |
| Capturas reales de GitHub y AWS | PENDIENTE (Equipo) | `docs/evidencias-requeridas.md` |

## Acciones del equipo (resumen)
1. Completar perfiles de GitHub; el/la líder publica el repositorio y envía invitaciones; los demás las aceptan.
2. Cada integrante hace al menos un commit y un Pull Request propio con revisión de otro integrante.
3. Iniciar AWS Academy, cargar credenciales, ejecutar la verificación y desplegar con la guía.
4. Cargar secretos/variables en GitHub y activar `AWS_DEPLOY_ENABLED`.
5. Adquirir/conectar el dominio y emitir el certificado ACM.
6. Tomar las capturas reales, completar portada e integrantes, verificar referencias y regenerar el documento.

## Actualización tras la auditoría técnica final (2026-11-27)
| Tarea | Estado | Evidencia |
|---|---|---|
| Auditoría técnica completa (código, pruebas, infraestructura, documentación, secretos) | COMPLETADA Y VERIFICADA | `AUDITORIA_TECNICA.md` |
| Corrección de hallazgos (rollback, despliegue, secreto JWT, anti-abuso, CI, CloudFront, README, documento) | COMPLETADA Y VERIFICADA | Rama `fix/auditoria-final`; `docs/evidencias/reejecucion-auditoria.txt` |
| Simulación del despliegue en EC2 (5 escenarios) | COMPLETADA Y VERIFICADA | `docs/evidencias/simulacion-despliegue-ec2.md` |
| Validación de workflows con actionlint | COMPLETADA Y VERIFICADA | 0 hallazgos |
| Material de sustentación | COMPLETADA Y VERIFICADA | `SUSTENTACION/` |
| Matriz de rúbrica (sin rúbrica oficial) | COMPLETADA Y VERIFICADA | `docs/matriz-cumplimiento.md` |
| PR `fix/auditoria-final → develop` y ejecución real de CI | PENDIENTE DE ACCESO | Ver `ESTADO_FINAL.md` P1 |
| Estado consolidado y acciones del equipo | COMPLETADA Y VERIFICADA | `ESTADO_FINAL.md` |
