# Evidencias y capturas necesarias para la entrega

**Regla:** solo se entregan capturas reales tomadas por el equipo. Las capturas de `docs/capturas/` fueron generadas
por la prueba E2E automatizada en un **entorno local** (2026-11-27) con datos de prueba creados por el propio test;
deben presentarse como tales, no como evidencia de AWS.

## Ya disponibles (generadas en este entorno)

| Evidencia | Archivo |
|---|---|
| Resultado de pruebas backend (50/50) | `docs/evidencias/resultado-pruebas-backend.txt` |
| Resultado de pruebas frontend (10/10) | `docs/evidencias/resultado-pruebas-frontend.txt` |
| Prueba E2E en navegador (18/18 pasos) | `docs/evidencias/resultado-e2e.md` |
| Colección Postman ejecutada con Newman (42 peticiones, 55 aserciones) | `docs/evidencias/resultado-newman.txt` |
| Rate limiting bloqueando una segunda ejecución inmediata | `docs/evidencias/rate-limit-segunda-ejecucion-newman.txt` |
| Prueba de que el test de concurrencia detecta dobles reservas | `docs/evidencias/prueba-mutacion-concurrencia.md` |
| Validación de la plantilla CloudFormation (`cfn-lint`) | `docs/evidencias/validaciones-infraestructura.txt` |
| Re-ejecución completa de la auditoría (clon limpio, infraestructura, E2E, Newman) | `docs/evidencias/reejecucion-auditoria.txt` |
| Simulación del despliegue en EC2 con rollback (5 escenarios) | `docs/evidencias/simulacion-despliegue-ec2.md` |
| 17 capturas de la aplicación (escritorio, tablet, móvil) | `docs/capturas/*.png` |

| Despliegue real en AWS (recursos, verificación de servicios, GitHub Actions, costos) | `docs/evidencias/despliegue-aws.md`, `docs/evidencias/verificacion-servicios.txt` |
| E2E contra la URL pública de producción (18/18) | `docs/evidencias/resultado-e2e-produccion.md` + `docs/capturas/aws/prod-*.png` (17 capturas) |
| Verificación técnica de producción (S3, roles, cabeceras, health) 11/11 | `docs/evidencias/verificacion-produccion.txt` |

## Pendientes — las debe tomar el equipo

> Las capturas de la **consola de AWS** y de **GitHub** deben tomarse desde las cuentas del equipo (la consola de AWS
> no se abrió desde el entorno automatizado). La sección AWS de abajo indica qué mostrar; los valores esperados están en
> `docs/evidencias/despliegue-aws.md`. CloudFront no aplica (bloqueado en el Learner Lab).

### GitHub (cada integrante)
- [ ] Perfil de GitHub completo de cada integrante (foto, nombre, bio, repositorio fijado).
- [ ] *Insights → Contributors* mostrando commits de cada integrante.
- [ ] Al menos un Pull Request por integrante con revisión y aprobación de otro integrante.
- [ ] Lista de ramas (`main`, `develop`, `feature/*`).
- [ ] Reglas de protección de `main` y `develop`.
- [ ] Pestaña *Actions*: ejecución del workflow **CI** en verde (detalle de los 3 jobs).
- [ ] Ejecución del workflow **Deploy** (Deploy #2 desplegó backend y frontend; capturar la siguiente ejecución en verde).
- [ ] Issues creados con las plantillas y asignados.

### AWS Academy
- [x] `verificacion-servicios.txt` generado con `00-verificar-servicios.sh`.
- [ ] CloudFormation: stack en `CREATE_COMPLETE` (pestañas *Resources* y *Outputs*, ocultando datos sensibles).
- [ ] EC2: instancia *running*, security group (80/443 públicos y 22), IP elástica `52.54.96.26`.
- [ ] RDS: instancia *Available*, *Publicly accessible: No*, subredes privadas.
- [ ] S3: ambos buckets con *Block all public access: On*.
- [ ] ~~CloudFront~~: no aplica (bloqueado en el Learner Lab; ver `verificacion-servicios.txt`).
- [ ] Route 53: hosted zone y registro alias (si se usa dominio).
- [ ] IAM: perfil `LabInstanceProfile` asociado a la instancia.
- [x] `curl https://52-54-96-26.sslip.io/api/health` respondiendo `"database":"ok"` (ver `verificacion-produccion.txt`).

### Aplicación desplegada
- [ ] Landing cargando por HTTPS con el candado del navegador (y el dominio personalizado, si existe).
- [x] Registro de un negocio, configuración de servicios y horarios en producción (`prod-03`, `prod-04`, `prod-05`).
- [x] Reserva de un cliente y visualización en el panel del negocio (`prod-07`, `prod-09`).
- [x] Intento de reservar un horario ocupado (`prod-08`).
- [x] Cancelación por el cliente y por el negocio (E2E en producción, pasos 13 y 14).
- [x] Vista móvil (`prod-14`, `prod-15`, `prod-17`).

Guardar las capturas en `docs/capturas/aws/` con nombres descriptivos (p. ej. `aws-01-stack-outputs.png`) y
referenciarlas en el documento académico (sección “Proceso de despliegue”).
