# Evidencias y capturas necesarias para la entrega

**Regla:** solo se entregan capturas reales tomadas por el equipo. Las capturas de `docs/capturas/` fueron generadas
por la prueba E2E automatizada en un **entorno local** (2026-11-27) con datos de prueba creados por el propio test;
deben presentarse como tales, no como evidencia de AWS.

## Ya disponibles (generadas en este entorno)

| Evidencia | Archivo |
|---|---|
| Resultado de pruebas backend (46/46) | `docs/evidencias/resultado-pruebas-backend.txt` |
| Resultado de pruebas frontend (10/10) | `docs/evidencias/resultado-pruebas-frontend.txt` |
| Prueba E2E en navegador (18/18 pasos) | `docs/evidencias/resultado-e2e.md` |
| Colección Postman ejecutada con Newman (42 peticiones, 55 aserciones) | `docs/evidencias/resultado-newman.txt` |
| Rate limiting bloqueando una segunda ejecución inmediata | `docs/evidencias/rate-limit-segunda-ejecucion-newman.txt` |
| Prueba de que el test de concurrencia detecta dobles reservas | `docs/evidencias/prueba-mutacion-concurrencia.md` |
| Validación de la plantilla CloudFormation (`cfn-lint`) | `docs/evidencias/validaciones-infraestructura.txt` |
| 17 capturas de la aplicación (escritorio, tablet, móvil) | `docs/capturas/*.png` |

## Pendientes — las debe tomar el equipo

### GitHub (cada integrante)
- [ ] Perfil de GitHub completo de cada integrante (foto, nombre, bio, repositorio fijado).
- [ ] *Insights → Contributors* mostrando commits de cada integrante.
- [ ] Al menos un Pull Request por integrante con revisión y aprobación de otro integrante.
- [ ] Lista de ramas (`main`, `develop`, `feature/*`).
- [ ] Reglas de protección de `main` y `develop`.
- [ ] Pestaña *Actions*: ejecución del workflow **CI** en verde (detalle de los 3 jobs).
- [ ] Ejecución del workflow **Deploy** en verde (cuando AWS esté configurado).
- [ ] Issues creados con las plantillas y asignados.

### AWS Academy
- [ ] `verificacion-servicios.txt` generado con `00-verificar-servicios.sh`.
- [ ] CloudFormation: stack en `CREATE_COMPLETE` (pestañas *Resources* y *Outputs*, ocultando datos sensibles).
- [ ] EC2: instancia *running*, security group (puertos 80 desde CloudFront y 22), IP elástica.
- [ ] RDS: instancia *Available*, *Publicly accessible: No*, subredes privadas.
- [ ] S3: ambos buckets con *Block all public access: On*.
- [ ] CloudFront: distribución *Enabled*, orígenes S3 (OAC) y EC2, comportamiento `/api/*`.
- [ ] Route 53: hosted zone y registro alias (si se usa dominio).
- [ ] IAM: perfil `LabInstanceProfile` asociado a la instancia.
- [ ] `curl https://<dominio-o-cloudfront>/api/health` respondiendo `"database":"ok"`.

### Aplicación desplegada
- [ ] Landing cargando por HTTPS con el candado del navegador (y el dominio personalizado, si existe).
- [ ] Registro de un negocio, configuración de servicios y horarios en producción.
- [ ] Reserva de un cliente y visualización en el panel del negocio.
- [ ] Intento de reservar un horario ocupado (mensaje de horario no disponible).
- [ ] Cancelación por el cliente y por el negocio.
- [ ] Vista móvil (DevTools → modo dispositivo o teléfono real).

Guardar las capturas en `docs/capturas/aws/` con nombres descriptivos (p. ej. `aws-01-stack-outputs.png`) y
referenciarlas en el documento académico (sección “Proceso de despliegue”).
