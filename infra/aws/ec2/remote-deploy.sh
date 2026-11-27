#!/usr/bin/env bash
# Despliegue del backend en EC2 (se ejecuta en el servidor, como root, desde GitHub Actions
# o manualmente). Crea una nueva "release", instala dependencias, aplica migraciones,
# cambia el enlace "current" y verifica la salud. Si la verificación falla, vuelve
# automáticamente a la release anterior.
#
# Uso: sudo bash remote-deploy.sh /ruta/al/backend
set -euo pipefail

SRC="${1:?Indica la ruta del directorio backend a desplegar}"
APP_DIR=/opt/agenda-facil
ENV_FILE=/etc/agenda-facil/api.env
REVISION=$(cat "$SRC/REVISION" 2>/dev/null || echo manual)
RELEASE="$APP_DIR/releases/$(date +%Y%m%d%H%M%S)-$REVISION"
PREVIOUS=$(readlink -f "$APP_DIR/current" 2>/dev/null || true)

[ -s "$ENV_FILE" ] || { echo "ERROR: $ENV_FILE está vacío. Configura las variables de entorno primero."; exit 1; }

echo "==> Creando release $RELEASE"
mkdir -p "$APP_DIR/releases"
cp -a "$SRC" "$RELEASE"
chown -R agenda:agenda "$RELEASE"

run_as_app() { sudo -u agenda bash -c "set -a; source '$ENV_FILE'; set +a; cd '$RELEASE'; $1"; }

echo "==> Instalando dependencias de producción"
run_as_app "npm ci --omit=dev --no-audit --no-fund"
echo "==> Generando cliente Prisma"
run_as_app "npx prisma generate"
echo "==> Aplicando migraciones (prisma migrate deploy)"
run_as_app "npx prisma migrate deploy"
echo "==> Cargando planes (idempotente)"
run_as_app "node prisma/seed.js"

echo "==> Activando release"
ln -sfn "$RELEASE" "$APP_DIR/current"
systemctl restart agenda-facil-api

echo "==> Verificando salud"
for _ in $(seq 1 15); do
  if curl -sf http://127.0.0.1:3000/api/health >/dev/null; then
    echo "Despliegue correcto: $REVISION"
    # Conserva las 5 releases más recientes
    find "$APP_DIR/releases" -mindepth 1 -maxdepth 1 -type d | sort | head -n -5 | xargs -r rm -rf
    exit 0
  fi
  sleep 2
done

echo "ERROR: la API no respondió. Revirtiendo a la release anterior."
journalctl -u agenda-facil-api -n 40 --no-pager || true
if [ -n "$PREVIOUS" ] && [ -d "$PREVIOUS" ]; then
  ln -sfn "$PREVIOUS" "$APP_DIR/current"
  systemctl restart agenda-facil-api
  echo "Rollback aplicado a $PREVIOUS"
fi
exit 1
