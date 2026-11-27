# Simulación local del despliegue en EC2 (remote-deploy.sh y rollback.sh)

Fecha: 2026-11-27T01:25:45Z. Entorno: contenedor Linux de desarrollo (NO es AWS).

Se reprodujo el servidor: usuario de sistema `agenda`, /opt/agenda-facil/releases, /etc/agenda-facil/api.env (mismo formato que escribe deploy.yml), MySQL 8 local con un usuario de aplicación de privilegios limitados y un sustituto de `systemctl` (el contenedor no ejecuta systemd).
Diferencias con EC2 real: no hay systemd ni Nginx, y npm se alcanzó a través del proxy del sandbox.

| Escenario | Esperado | Resultado |
|---|---|---|
| A. Migraciones fallan (BD inaccesible) | exit 1, release incompleta eliminada, producción sin cambios | OK |
| B. Despliegue v1 | exit 0, health OK, marca .deploy-ok | OK |
| C. Despliegue v2 | exit 0, health OK | OK |
| D. Release que no arranca | exit 1, rollback automático a v2 | OK |
| E. rollback.sh manual | activa v1 (release sana anterior), health OK | OK |

Errores encontrados por esta simulación y corregidos:
1. rollback.sh elegía como "anterior" una release incompleta de un despliegue fallido → API caída tras el rollback.
2. La limpieza de releases antiguas devolvía código 1 con menos de 5 releases (grep + pipefail) → un despliegue correcto se reportaba como fallido.

## Registro completo

```
################ A) Falla antes de activar (BD inaccesible en migraciones) — se espera exit 1 y sin release
==> Creando release /opt/agenda-facil/releases/20261127012418-fallo-migracion
==> Instalando dependencias de producción

added 159 packages in 5s
==> Generando cliente Prisma
Prisma schema loaded from prisma/schema.prisma

✔ Generated Prisma Client (v6.19.3) to ./node_modules/@prisma/client in 114ms

Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

Tip: Want to turn off tips and other hints? https://pris.ly/tip-4-nohints

==> Aplicando migraciones (prisma migrate deploy)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": MySQL database "nada" at "127.0.0.1:1"

Error: P1001: Can't reach database server at `127.0.0.1:1`

Please make sure your database server is running at `127.0.0.1:1`.
ERROR: el despliegue falló antes de activarse. Se descarta /opt/agenda-facil/releases/20261127012418-fallo-migracion (la versión en producción no cambió).
exit=1  current -> ninguno
releases tras A: []
################ B) Despliegue correcto v1 — se espera exit 0
==> Creando release /opt/agenda-facil/releases/20261127012426-7d88335
==> Instalando dependencias de producción

added 159 packages in 6s
==> Generando cliente Prisma
Prisma schema loaded from prisma/schema.prisma

✔ Generated Prisma Client (v6.19.3) to ./node_modules/@prisma/client in 114ms

Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

Tip: Need your database queries to be 1000x faster? Accelerate offers you that and more: https://pris.ly/tip-2-accelerate

==> Aplicando migraciones (prisma migrate deploy)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": MySQL database "agenda_facil_deploysim" at "localhost:3306"

1 migration found in prisma/migrations


No pending migrations to apply.
==> Cargando planes (idempotente)
Planes listos: BASICO, PROFESIONAL
==> Activando release
==> Verificando salud
Despliegue correcto: 7d88335
exit=0  current -> /opt/agenda-facil/releases/20261127012426-7d88335
################ C) Despliegue correcto v2 — se espera exit 0
==> Creando release /opt/agenda-facil/releases/20261127012438-v2
==> Instalando dependencias de producción

added 159 packages in 6s
==> Generando cliente Prisma
Prisma schema loaded from prisma/schema.prisma

✔ Generated Prisma Client (v6.19.3) to ./node_modules/@prisma/client in 112ms

Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

Tip: Want to turn off tips and other hints? https://pris.ly/tip-4-nohints

==> Aplicando migraciones (prisma migrate deploy)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": MySQL database "agenda_facil_deploysim" at "localhost:3306"

1 migration found in prisma/migrations


No pending migrations to apply.
==> Cargando planes (idempotente)
Planes listos: BASICO, PROFESIONAL
==> Activando release
==> Verificando salud
Despliegue correcto: v2
exit=0  current -> /opt/agenda-facil/releases/20261127012438-v2
################ D) Release rota — se espera exit 1 y rollback automático a v2
==> Creando release /opt/agenda-facil/releases/20261127012449-broken-test
==> Instalando dependencias de producción

added 159 packages in 6s
==> Generando cliente Prisma
Prisma schema loaded from prisma/schema.prisma

✔ Generated Prisma Client (v6.19.3) to ./node_modules/@prisma/client in 102ms

Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

Tip: Interested in query caching in just a few lines of code? Try Accelerate today! https://pris.ly/tip-3-accelerate

==> Aplicando migraciones (prisma migrate deploy)
Prisma schema loaded from prisma/schema.prisma
Datasource "db": MySQL database "agenda_facil_deploysim" at "localhost:3306"

1 migration found in prisma/migrations


No pending migrations to apply.
==> Cargando planes (idempotente)
Planes listos: BASICO, PROFESIONAL
==> Activando release
==> Verificando salud
ERROR: la API no respondió. Revirtiendo a la release anterior.
No journal files were found.
-- No entries --
Rollback aplicado a /opt/agenda-facil/releases/20261127012438-v2
exit=1  current -> /opt/agenda-facil/releases/20261127012438-v2
################ E) rollback.sh manual — se espera v1
Releases sanas disponibles:
  /opt/agenda-facil/releases/20261127012426-7d88335
  /opt/agenda-facil/releases/20261127012438-v2
Actual: /opt/agenda-facil/releases/20261127012438-v2
Rollback completado → /opt/agenda-facil/releases/20261127012426-7d88335
exit=0  current -> /opt/agenda-facil/releases/20261127012426-7d88335
Releases sanas: /opt/agenda-facil/releases/20261127012426-7d88335 /opt/agenda-facil/releases/20261127012438-v2 
{"status":"ok","database":"ok","time":"2026-11-27T01:25:33.012Z","version":"dev"}
```
