#!/usr/bin/env bash
# Rollback manual del backend en EC2: activa la release anterior (o la indicada).
# Uso:
#   sudo bash rollback.sh            → vuelve a la release inmediatamente anterior
#   sudo bash rollback.sh <carpeta>  → activa una release concreta de /opt/agenda-facil/releases
# Nota: las migraciones de base de datos NO se revierten automáticamente (Prisma aplica
# migraciones hacia adelante). Por eso las migraciones deben ser compatibles con la versión anterior.
set -euo pipefail

APP_DIR=/opt/agenda-facil
CURRENT=$(readlink -f "$APP_DIR/current")
mapfile -t RELEASES < <(find "$APP_DIR/releases" -mindepth 1 -maxdepth 1 -type d | sort)

echo "Releases disponibles:"
printf '  %s\n' "${RELEASES[@]}"
echo "Actual: $CURRENT"

if [ $# -ge 1 ]; then
  TARGET="$APP_DIR/releases/$1"
else
  TARGET=""
  for i in "${!RELEASES[@]}"; do
    if [ "${RELEASES[$i]}" = "$CURRENT" ] && [ "$i" -gt 0 ]; then TARGET="${RELEASES[$((i - 1))]}"; fi
  done
fi

if [ -z "$TARGET" ] || [ ! -d "$TARGET" ]; then
  echo "No hay una release anterior válida."
  exit 1
fi
ln -sfn "$TARGET" "$APP_DIR/current"
systemctl restart agenda-facil-api
sleep 3
curl -sf http://127.0.0.1:3000/api/health && echo && echo "Rollback completado → $TARGET"
