# Agenda Fácil — Presentación del proyecto

> Guion sugerido para abrir la sustentación (3–4 minutos). Ajustar nombres y roles del equipo.

## 1. El problema (30 s)
Barberías, peluquerías, consultorios, estudios de tatuajes y centros de estética gestionan sus citas por WhatsApp,
llamadas o un cuaderno. Resultado: **reservas duplicadas**, **citas olvidadas**, **saturación de mensajes** y
**pérdida del historial de clientes**.

## 2. La solución (45 s)
**Agenda Fácil** es una plataforma **SaaS** (software como servicio): muchos negocios usan la misma aplicación en la
nube, cada uno con sus datos aislados.

- El **negocio** registra sus servicios (precio y duración), sus horarios, sus clientes y gestiona su agenda desde un panel.
- El **cliente** busca el negocio, ve los horarios libres en tiempo real, reserva y puede cancelar dentro del margen permitido.
- El sistema **impide reservas incompatibles**, incluso si dos personas reservan al mismo segundo.

## 3. Modelo de negocio (20 s)
Plan **Básico** (10 servicios, 300 clientes) y plan **Profesional** (ilimitado + estadísticas de rendimiento), con
**14 días de prueba gratuita**. En esta versión académica **no hay cobros**: los planes aplican límites reales, pero no
hay pasarela de pago (mejora futura).

## 4. Tecnología (45 s)
| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite (SPA responsive en español) |
| Backend | Node.js 22 + Express (API REST) |
| Datos | MySQL 8 con Prisma (migraciones versionadas) |
| Seguridad | JWT, bcrypt, Zod, helmet, rate limiting, aislamiento multi-tenant |
| Nube (arquitectura) | EC2, RDS, S3, CloudFront, Route 53, IAM — definidos con CloudFormation |
| Calidad | 48 pruebas de backend, 10 de frontend, E2E en navegador (18 pasos), Postman (55 aserciones) |
| CI/CD | GitHub Actions: lint, pruebas, build, validación de infraestructura, E2E y despliegue con rollback |

## 5. Arquitectura en una frase (20 s)
Los usuarios entran por **HTTPS** a **CloudFront** (dominio en **Route 53**), que sirve el frontend desde **S3 privado**
y envía `/api/*` a **EC2** (Nginx + Node.js); EC2 consulta **RDS MySQL** en una subred privada y guarda logos en otro
**S3 privado**; **IAM** controla los permisos.

## 6. Estado honesto (30 s)
| Hecho y verificado | Preparado, pendiente de ejecutar | Requiere al equipo |
|---|---|---|
| Aplicación completa y probada localmente; auditoría técnica con 15 hallazgos corregidos/documentados | Despliegue en AWS (plantilla validada, scripts ensayados en simulación); workflows de CI/CD | Publicar en GitHub, commits/PRs de cada integrante, Learner Lab, dominio |

## 7. Cierre (15 s)
“Agenda Fácil resuelve un problema cotidiano con una arquitectura en la nube segura, automatizada y lista para crecer.”
