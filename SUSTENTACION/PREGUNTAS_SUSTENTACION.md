# Preguntas de sustentación con respuestas

Las respuestas se basan en el código real del repositorio. Se indica el archivo para poder mostrarlo si lo piden.

## Producto y alcance

**1. ¿Qué problema resuelve Agenda Fácil?**
La gestión manual de citas por WhatsApp/llamadas, que causa dobles reservas, olvidos, saturación de mensajes y pérdida
del historial. Centraliza la agenda y permite que el cliente reserve solo, sin choques de horario.

**2. ¿Por qué es un SaaS?**
Una sola aplicación en la nube atiende a muchos negocios (inquilinos), cada uno con sus datos aislados, sin instalar
nada; el modelo de ingresos es por suscripción (Básico / Profesional con prueba gratuita).

**3. ¿Qué diferencia hay entre los planes?**
Básico: hasta 10 servicios y 300 clientes. Profesional: ilimitado y estadísticas de rendimiento (servicios más
reservados, reservas por día, tasa de cancelación). Ambos con 14 días de prueba. Los límites se aplican en el backend
(`lib/plans.js`). No hay cobro real: la pasarela de pagos es una mejora futura.

**4. ¿Qué quedó fuera del alcance?**
Pagos, recordatorios por WhatsApp/correo, varios usuarios por negocio, reportes de ventas avanzados y app móvil nativa.

## Frontend

**5. ¿Por qué utilizar React?**
Permite construir la interfaz con componentes reutilizables (botones, modales, selector de horarios usado por cliente y
negocio), maneja el estado de forma declarativa y tiene un ecosistema maduro (React Router, Testing Library). Con Vite
se compila a archivos estáticos que se sirven baratos y rápidos desde S3 + CloudFront.

**6. ¿Qué es Vite y para qué se usa?**
Herramienta de desarrollo y build: servidor con recarga instantánea y proxy hacia la API en desarrollo, y en producción
genera `dist/` con archivos optimizados y con hash para caché de larga duración (`vite.config.js`).

**7. ¿Cómo se protegen las rutas del panel en React?**
El componente `RequireRole` (`components/Layouts.jsx`) verifica la sesión del `AuthContext`: sin usuario redirige a
`/ingresar`; con rol distinto redirige a su inicio. Es una protección de experiencia de usuario: la seguridad real está
en el backend, que valida token y rol en cada petición.

**8. ¿Dónde se guarda la sesión?**
El JWT se guarda en `localStorage` y se envía en la cabecera `Authorization: Bearer`. Al recargar, `AuthContext` llama a
`/api/auth/me`. Si la API responde 401, el cliente HTTP cierra la sesión automáticamente.

**9. ¿Cómo es responsive la aplicación?**
CSS con variables y *media queries*: en móvil la barra lateral pasa a menú desplegable, las tablas se vuelven tarjetas y
los modales ocupan la parte inferior. La prueba E2E comprueba que no haya desbordamiento horizontal en móvil, tablet y
escritorio.

## Backend y base de datos

**10. ¿Cómo funciona el backend?**
Es una API REST en Express. Cada petición pasa por helmet, CORS, parseo JSON con límite, rate limiting (en auth),
autenticación JWT, verificación de rol y validación Zod; luego la ruta usa Prisma o los servicios de negocio y responde
JSON. Los errores se convierten en un formato único en `middleware/error.js`.

**11. ¿Cómo se evita una doble reserva?**
En `services/reservations.js`, dentro de una transacción se ejecuta `SELECT … FROM businesses WHERE id = ? FOR UPDATE`.
Ese candado hace que dos reservas del mismo negocio se procesen una tras otra; la segunda ve la primera ya guardada,
detecta el solapamiento (`inicio < fin_nuevo` y `fin > inicio_nuevo`) y recibe 409. Se probó con 10 peticiones
simultáneas (solo 1 se confirma) y se demostró que, sin el candado, se creaban 9 duplicadas.

**12. ¿Por qué no basta con validar antes de insertar?**
Porque entre la validación y la inserción otra petición puede insertar la misma hora (condición de carrera). El bloqueo
dentro de la transacción convierte “validar e insertar” en una operación atómica por negocio.

**13. ¿Por qué no un índice único en la hora de inicio?**
Los servicios tienen duraciones distintas: una cita de 60 min a las 10:00 choca con una de 30 min a las 10:30 aunque
las horas de inicio sean diferentes. Un índice único no detecta solapamientos de intervalos, y MySQL no tiene índices
únicos parciales para ignorar las canceladas.

**14. ¿Cómo se relacionan las tablas?**
`users 1—0..1 businesses` (dueño); `plans 1—N businesses`; `businesses 1—N services / clients / reservations` y
`1—7 business_hours`; `reservations N—1 services` y `N—1 clients`; `clients N—0..1 users` (si el cliente tiene cuenta).
Ver `docs/diagramas/04-modelo-entidad-relacion.png`.

**15. ¿Por qué el cliente es una ficha por negocio y no un usuario global?**
Porque cada negocio administra sus propios datos (notas, teléfono) y no debe ver los de otros negocios. Si la persona
tiene cuenta, la ficha se enlaza con su usuario; si no, el negocio puede registrarla manualmente.

**16. ¿Qué son las migraciones?**
Archivos SQL versionados generados por Prisma (`prisma/migrations`) que llevan la base de datos de una versión a otra.
En CI y en producción se aplican con `prisma migrate deploy`, de forma reproducible.

**17. ¿Cómo se maneja la zona horaria?**
Cada negocio tiene su zona (p. ej. `America/Bogota`). Las reservas se guardan como hora local del negocio y “ahora” se
calcula en esa zona (`lib/time.js`), así el resultado no depende de que el servidor EC2 esté en UTC.

**18. ¿Qué reglas tiene la cancelación?**
El cliente solo puede cancelar reservas confirmadas y hasta *N* horas antes (0–168, configurable por el negocio). El
negocio puede cancelar en cualquier momento; una cita cancelada no se reabre.

## Seguridad

**19. ¿Cómo se protege la información?**
Contraseñas con bcrypt; JWT con expiración; autorización por rol; aislamiento por negocio en cada consulta; validación
Zod; consultas parametrizadas (Prisma) contra inyección SQL; helmet y CORS; rate limiting; validación del tipo real de
imágenes; secretos solo en variables de entorno/GitHub Secrets; en AWS: HTTPS, RDS privada, S3 privados, IMDSv2.

**20. ¿Cómo garantizan que un negocio no vea datos de otro?**
El identificador del negocio sale del token, nunca de la URL o el cuerpo; todas las consultas filtran por él y los
recursos ajenos responden 404. Hay 6 pruebas específicas (`tests/api/isolation.test.js`).

**21. ¿Qué pasa si alguien intenta adivinar contraseñas?**
Tras 20 intentos en 15 minutos desde la misma IP la API responde 429. Además, el mensaje de error es igual exista o no el
correo, para no revelar cuentas.

**22. ¿Qué encontró la auditoría técnica?**
15 hallazgos (`AUDITORIA_TECNICA.md`): entre ellos, un rollback que podía activar un despliegue incompleto, el PATH de
sudo en Amazon Linux 2023, un secreto JWT de ejemplo aceptado en producción y la posibilidad de que un cliente llenara
la agenda. Todos corregidos y verificados con pruebas o simulación.

## AWS

**23. ¿Qué hace EC2?**
Es la máquina virtual donde corre la API: Nginx recibe en el puerto 80 (solo desde CloudFront) y reenvía a Node.js en el
3000, administrado por systemd para reiniciarse si falla.

**24. ¿Qué hace RDS?**
Es la base de datos MySQL administrada por AWS (copias de seguridad, parches). Está en subredes privadas sin acceso desde
Internet; solo EC2 puede conectarse por el puerto 3306.

**25. ¿Para qué sirve S3?**
Para almacenar objetos: un bucket privado con el frontend compilado (lo lee solo CloudFront mediante OAC) y otro privado
con los logos de los negocios (la API entrega enlaces prefirmados temporales).

**26. ¿Qué función tiene CloudFront?**
Es la CDN y la puerta de entrada HTTPS: entrega el frontend desde ubicaciones cercanas al usuario, aplica cabeceras de
seguridad, reescribe rutas de la SPA y envía `/api/*` a EC2 sin caché, reenviando el token de autorización.

**27. ¿Qué es Route 53?**
El servicio DNS de AWS: traduce el dominio (p. ej. `www.midominio.com`) a la distribución de CloudFront mediante un
registro alias. En Learner Lab no se pueden comprar dominios, así que el dominio se registra fuera y se delega o se
apunta con CNAME.

**28. ¿Qué es IAM?**
El servicio de identidades y permisos de AWS. El principio es el mínimo privilegio: la instancia solo debería poder
leer/escribir logos en su bucket y CI solo publicar el frontend e invalidar CloudFront (`infra/aws/iam/`). En Learner
Lab no se pueden crear roles, así que se usa `LabInstanceProfile`.

**29. ¿Qué es CloudFormation y por qué usarlo?**
Infraestructura como código: un archivo YAML describe VPC, EC2, RDS, S3, CloudFront y Route 53, y AWS los crea en el
orden correcto. Es reproducible, revisable en Git y validable (cfn-lint en CI).

**30. ¿Está desplegado?**
Responder con la verdad del día: si el equipo desplegó, mostrar la URL y la consola; si no, explicar que la plantilla y
los scripts están validados y ensayados en simulación, y que el despliegue requiere la sesión del Learner Lab.

## Git, GitHub y CI/CD

**31. ¿Qué es CI/CD?**
CI: integrar cambios frecuentemente verificándolos automáticamente (lint, pruebas, build). CD: publicar automáticamente
lo que pasa las verificaciones, de forma repetible y con rollback.

**32. ¿Qué hace su pipeline?**
En cada PR: pruebas de backend con MySQL real, pruebas y build del frontend, validación de infraestructura y prueba E2E
en navegador. Al integrar en `main`: despliegue del backend a EC2 con health check y rollback automático, y del
frontend a S3 con invalidación de CloudFront.

**33. ¿Cómo trabajan las ramas?**
`main` = producción; `develop` = integración; `feature/frontend`, `feature/backend`, `feature/database`,
`feature/aws-deployment`, `feature/documentation` = trabajo por área. Las features se integran a `develop` por PR y
`develop` a `main` en cada versión.

**34. ¿Qué es un Pull Request?**
Una solicitud para integrar los cambios de una rama en otra. Permite revisar el código, comentar, ver el resultado del
CI y aprobar antes de fusionar. La protección de ramas exige CI en verde y una aprobación para `main`.

**35. ¿Qué pasa si un despliegue sale mal?**
El script del servidor verifica `/api/health`; si no responde, reactiva la versión anterior automáticamente. También se
puede re-desplegar un tag anterior desde Actions o ejecutar `rollback.sh` en EC2.

## Calidad y escalabilidad

**36. ¿Qué pruebas tiene el proyecto?**
48 pruebas de backend (unitarias y de API contra MySQL), 10 de frontend, una prueba E2E de 18 pasos en Chromium y una
colección Postman de 42 peticiones (55 aserciones). Además, verificaciones de mutación que demuestran que las pruebas de
concurrencia y anti-abuso detectan el error si se elimina la protección.

**37. ¿Cómo escala la aplicación?**
La API es sin estado (JWT): se pueden poner varias instancias EC2 detrás de un balanceador con Auto Scaling. RDS escala
verticalmente y con réplicas de lectura/Multi-AZ; S3 y CloudFront escalan solos. El bloqueo anti doble reserva vive en
MySQL, por lo que sigue funcionando con varias instancias.

**38. ¿Qué mejorarían con más tiempo?**
Pagos y suscripciones reales, notificaciones, multiusuario por negocio, TLS entre CloudFront y EC2, OIDC de GitHub con
roles IAM en lugar de claves, monitoreo con CloudWatch y Auto Scaling.
