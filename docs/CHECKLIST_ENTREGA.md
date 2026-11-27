# CHECKLIST DE ENTREGA — Agenda Fácil

Fecha de corte: 2026-11-27. Estados: **COMPLETADO** · **PARCIAL** · **PENDIENTE** · **BLOQUEADO**.
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
| API REST completa con roles, validación, errores, CORS, rate limit | COMPLETADO | `backend/src`, 46 pruebas |
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
| HTTPS, RDS privada, S3 privado, IAM mínimo privilegio | PARCIAL | Definido en CloudFormation/IAM; falta desplegar (IAM limitado por Learner Lab) |

## 7. Git y GitHub
| Tarea | Estado | Evidencia |
|---|---|---|
| Repositorio local con `main`, `develop`, 5 ramas `feature/*`, tag `v1.0.0-mvp` | COMPLETADO | `git branch -a`, `git log --graph` |
| `.gitignore`, README, CONTRIBUTING, LICENSE, plantillas PR/issues, Dependabot | COMPLETADO | Raíz y `.github/` |
| Publicar en GitHub | PENDIENTE (Equipo) | `scripts/github/publicar-en-github.sh` |
| Perfiles completos, commits y PRs de cada integrante | PENDIENTE (Equipo) | `docs/guia-git-github.md` |

## 8. CI/CD
| Tarea | Estado | Evidencia |
|---|---|---|
| Workflow CI (lint, pruebas, build, E2E) | PARCIAL | `ci.yml`; comandos ejecutados en clon limpio; sin ejecución en GitHub aún |
| Workflow Deploy con secretos, condiciones y rollback | PARCIAL | `deploy.yml`, `infra/aws/ec2/rollback.sh`; requiere AWS |
| Evidencia de pipeline en verde | PENDIENTE (Equipo) | Captura de *Actions* tras el primer push |

## 9–10. AWS Academy y dominio
| Tarea | Estado | Evidencia |
|---|---|---|
| Plantilla CloudFormation (EC2, RDS, S3, CloudFront, Route 53) | COMPLETADO | Validada con `cfn-lint` (0 errores) |
| Scripts de verificación, despliegue, publicación y limpieza | COMPLETADO | `infra/aws/scripts`, ShellCheck sin hallazgos |
| Verificar servicios permitidos en el Learner Lab | PENDIENTE (Equipo) | `00-verificar-servicios.sh` |
| Desplegar infraestructura y aplicación | PENDIENTE (Equipo) | `docs/guia-aws-academy.md` §3–6 |
| Dominio personalizado + certificado ACM | PENDIENTE (Equipo) | Guía §7 (no se inventó ningún dominio) |

## 11. Pruebas
| Tarea | Estado | Evidencia |
|---|---|---|
| Backend 46/46, frontend 10/10, E2E 18/18, Newman 55/55 | COMPLETADO | `docs/evidencias/` |
| Diseño responsive verificado (móvil, tablet, escritorio) | COMPLETADO | E2E sin desbordamiento + capturas |
| Colección Postman | COMPLETADO | `docs/postman/` |
| Pruebas sobre el entorno desplegado | PENDIENTE (Equipo) | Ejecutar Newman con el entorno de producción |

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
