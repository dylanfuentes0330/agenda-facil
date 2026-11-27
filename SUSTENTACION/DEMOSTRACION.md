# Guion de demostración (7–9 minutos)

## Preparación (antes de la sustentación)
- [ ] Decidir el entorno: **producción en AWS** (si se desplegó: iniciar el Learner Lab ≥ 20 min antes) o **local**.
- [ ] Entorno local: MySQL encendido, luego en dos terminales:

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

- [ ] Abrir en pestañas: la app, una **ventana de incógnito** (para el cliente), GitHub (*Actions* y *Pull requests*) y, si aplica, la consola AWS.
- [ ] Usar datos creados en vivo (no usar el seed DEMO como evidencia). Tener preparado un correo de negocio y uno de cliente.
- [ ] Plan B: si falla la red o AWS, mostrar las capturas de `docs/capturas/` y el video/registro de la prueba E2E.

## Guion

| Min | Quién | Acción | Qué decir |
|---|---|---|---|
| 0:00–0:45 | Integrante 1 | Mostrar la landing (`/`) y bajar hasta *Planes* | Problema, solución y modelo de negocio; los planes vienen de la API; sin cobros en el MVP |
| 0:45–2:00 | Integrante 1 | **Registrar un negocio** (mostrar primero un error de validación) | Validación en el cliente y en el servidor; contraseña con bcrypt; redirección al panel por rol |
| 2:00–3:00 | Integrante 2 | **Servicios**: crear “Corte de cabello” (30 min, precio). **Horarios**: abrir sábado 09:00–13:00 | CRUD con límites del plan; la disponibilidad se calcula a partir de estos datos |
| 3:00–4:30 | Integrante 3 | En incógnito: **registrar cliente** → *Reservar cita* → buscar el negocio → servicio → fecha → hora → **Confirmar** | Franjas en tiempo real según horario, duración e intervalo |
| 4:30–5:15 | Integrante 3 | Con otro cliente (o recargando), mostrar que **la hora reservada aparece ocupada** | Explicar la transacción con `SELECT … FOR UPDATE` y la prueba de 10 reservas simultáneas |
| 5:15–6:15 | Integrante 2 | En el panel: **Citas** → ver la reserva → **Modificar** (reprogramar) → crear una cita manual con cliente nuevo → **Cancelar** una | Gestión completa del negocio; estados de la cita |
| 6:15–6:45 | Integrante 3 | Cliente: **Mis reservas** → **Cancelar** (dentro del margen) | Regla de cancelación configurable |
| 6:45–7:15 | Integrante 4 | Panel: **Clientes** → ficha con historial; **Resumen** del día; vista móvil con DevTools | Historial, panel del día y diseño responsive |
| 7:15–8:30 | Integrante 4 | GitHub: rama/PR con el CI en verde (4 jobs) y, si se desplegó, la consola AWS (CloudFormation *Outputs*, EC2, RDS privada, CloudFront) y `https://…/api/health` | CI/CD, infraestructura como código y estado real del despliegue |
| 8:30–9:00 | Todos | Cierre | Lo logrado, lo pendiente y las mejoras futuras |

## Comprobaciones rápidas para mostrar en terminal (opcional)

```bash
npm test --prefix backend
```

```bash
curl -s https://DOMINIO_O_CLOUDFRONT/api/health
```

## Si algo falla en vivo
- *“El horario ya no está disponible”*: es la protección contra doble reserva funcionando; elegir otra hora.
- *Error 429 al iniciar sesión*: el rate limit (20 intentos/15 min); usar otra red o esperar.
- *AWS no responde*: el Learner Lab pudo haberse detenido; cambiar a la demostración local y explicarlo.
