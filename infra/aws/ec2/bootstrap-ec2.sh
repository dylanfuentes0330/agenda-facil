#!/usr/bin/env bash
# Preparación inicial de la instancia EC2 (Amazon Linux 2023) para la API de Agenda Fácil.
# Se ejecuta automáticamente como "user data" desde la plantilla CloudFormation, o puede
# pegarse manualmente en "Advanced details → User data" al lanzar la instancia desde la consola.
# Idempotente: puede ejecutarse varias veces.
set -euo pipefail

APP_DIR=/opt/agenda-facil
ENV_DIR=/etc/agenda-facil

dnf -y update
dnf -y install nginx tar gzip xz mariadb105

# Node.js 22 LTS desde nodejs.org, verificando la suma SHA-256 publicada
if ! command -v node >/dev/null || ! node -v | grep -q '^v22\.'; then
  cd /tmp
  BASE=https://nodejs.org/dist/latest-v22.x
  curl -fsSLO "$BASE/SHASUMS256.txt"
  FILE=$(grep -o 'node-v22[^ ]*-linux-x64.tar.xz' SHASUMS256.txt | head -n1)
  curl -fsSLO "$BASE/$FILE"
  grep " $FILE\$" SHASUMS256.txt | sha256sum -c -
  tar -xJf "$FILE" -C /usr/local --strip-components=1
  rm -f "$FILE" SHASUMS256.txt
fi

# Usuario de sistema sin shell para ejecutar la API (mínimo privilegio)
id agenda >/dev/null 2>&1 || useradd --system --home-dir "$APP_DIR" --shell /sbin/nologin agenda
install -d -o agenda -g agenda "$APP_DIR" "$APP_DIR/releases"
install -d -m 750 -o root -g agenda "$ENV_DIR"
[ -f "$ENV_DIR/api.env" ] || install -m 600 -o agenda -g agenda /dev/null "$ENV_DIR/api.env"

cat > /etc/systemd/system/agenda-facil-api.service <<'UNIT'
[Unit]
Description=Agenda Fácil API (Node.js + Express)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=agenda
Group=agenda
WorkingDirectory=/opt/agenda-facil/current
EnvironmentFile=/etc/agenda-facil/api.env
ExecStart=/usr/local/bin/node src/server.js
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/nginx/conf.d/agenda-facil.conf <<'NGINX'
# Nginx como proxy inverso: recibe tráfico de CloudFront en el puerto 80 y lo
# reenvía a Node.js (127.0.0.1:3000). Solo expone /api/; el frontend se sirve desde S3.
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    server_tokens off;
    client_max_body_size 3m;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;
        proxy_read_timeout 30s;
    }

    location / {
        return 404;
    }
}
NGINX

# Evita que el server por defecto de nginx.conf compita con el nuestro
sed -i 's/listen       80;/listen       8080;/; s/listen       \[::\]:80;/listen       [::]:8080;/' /etc/nginx/nginx.conf || true

systemctl daemon-reload
systemctl enable --now nginx
systemctl enable agenda-facil-api
nginx -t && systemctl reload nginx
echo "Bootstrap completado. La API se inicia con el primer despliegue (remote-deploy.sh)."
