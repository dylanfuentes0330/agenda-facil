#!/usr/bin/env bash
# Publica el frontend compilado (frontend/dist) en la instancia EC2 cuando no se usa CloudFront
# (EnableCloudFront=false). Se ejecuta en el servidor, como root, desde GitHub Actions o
# desde 02-publicar-frontend.sh. Cada publicación es una carpeta nueva y el cambio es atómico
# (enlace simbólico /opt/agenda-facil/frontend); se conservan las 3 más recientes.
#
# Uso: sudo bash remote-frontend.sh /ruta/a/dist
set -euo pipefail

SRC="${1:?Indica la carpeta dist del frontend}"
APP_DIR=/opt/agenda-facil
RELEASES="$APP_DIR/frontend-releases"
RELEASE="$RELEASES/$(date +%Y%m%d%H%M%S)"

[ -f "$SRC/index.html" ] || { echo "ERROR: $SRC no contiene index.html (¿se ejecutó npm run build?)"; exit 1; }

mkdir -p "$RELEASES"
cp -a "$SRC" "$RELEASE"
chown -R agenda:agenda "$RELEASE"
chmod -R a+rX "$RELEASE"
ln -sfn "$RELEASE" "$APP_DIR/frontend"
nginx -t
systemctl reload nginx

# Sin HTTPS, el puerto 80 sirve la SPA. Con HTTPS (configurar-https.sh), el 80 solo redirige para el nombre
# público y la SPA se sirve en el 443: se acepta cualquiera de los dos (-k: solo es una comprobación local).
if ! curl -sf -o /dev/null http://127.0.0.1/ && ! curl -sfk -o /dev/null https://127.0.0.1/; then
  echo "ERROR: Nginx no devuelve el frontend en http://127.0.0.1/ ni en https://127.0.0.1/"
  exit 1
fi
find "$RELEASES" -mindepth 1 -maxdepth 1 -type d | sort | head -n -3 | { grep -vxF "$RELEASE" || true; } | xargs -r rm -rf
echo "Frontend publicado en $RELEASE"
