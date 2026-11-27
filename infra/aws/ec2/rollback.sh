#!/usr/bin/env bash
# Rollback manual del backend en EC2: activa la release SANA anterior (o la indicada).
# Solo se consideran releases marcadas con .deploy-ok (desplegadas y verificadas con éxito).
# Uso:
#   sudo bash rollback.sh            → vuelve a la release sana inmediatamente anterior
#   sudo bash rollback.sh <carpeta>  → activa una release concreta de /opt/agenda-facil/releases
# Si la release destino no responde al health check, se restaura la que estaba activa.
# Nota: las migraciones de base de datos NO se revierten automáticamente (Prisma aplica
# migraciones hacia adelante). Por eso las migraciones deben ser compatibles con la versión anterior.
set -euo pipefail
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

APP_DIR=/opt/agenda-facil
CURRENT=$(readlink -f "$APP_DIR/current")
mapfile -t HEALTHY < <(find "$APP_DIR/releases" -mindepth 2 -maxdepth 2 -name .deploy-ok -printf '%h\n' | sort)

echo "Releases sanas disponibles:"
printf '  %s\n' "${HEALTHY[@]}"
echo "Actual: $CURRENT"

TARGET=""
if [ $# -ge 1 ]; then
  TARGET="$APP_DIR/releases/$1"
  [ -f "$TARGET/.deploy-ok" ] || { echo "La release indicada no existe o no está marcada como sana."; exit 1; }
else
  for release in "${HEALTHY[@]}"; do
    if [[ "$release" < "$CURRENT" ]]; then TARGET="$release"; fi
  done
fi

if [ -z "$TARGET" ]; then
  echo "No hay una release sana anterior a la actual."
  exit 1
fi

health() {
  for _ in $(seq 1 15); do
    curl -sf http://127.0.0.1:3000/api/health >/dev/null && return 0
    sleep 2
  done
  return 1
}

ln -sfn "$TARGET" "$APP_DIR/current"
systemctl restart agenda-facil-api
if health; then
  echo "Rollback completado → $TARGET"
else
  echo "ERROR: $TARGET no respondió; se restaura $CURRENT"
  ln -sfn "$CURRENT" "$APP_DIR/current"
  systemctl restart agenda-facil-api
  exit 1
fi
