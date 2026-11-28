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

install -d -o agenda -g agenda "$APP_DIR/frontend-releases"

cat > /etc/nginx/conf.d/agenda-facil.conf <<'NGINX'
# Nginx como proxy inverso de la API (127.0.0.1:3000) y servidor del frontend compilado.
# - Con CloudFront: el puerto 80 solo recibe /api/* desde CloudFront; el frontend sale de S3.
# - Sin CloudFront (EnableCloudFront=false): sirve también la SPA desde /opt/agenda-facil/frontend
#   (publicada por remote-frontend.sh); configurar-https.sh añade el certificado de Let's Encrypt.
map $http_x_forwarded_proto $agenda_forwarded_proto {
    default $http_x_forwarded_proto;
    ''      $scheme;
}

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
        proxy_set_header X-Forwarded-Proto $agenda_forwarded_proto;
        proxy_read_timeout 30s;
    }

    # Frontend (SPA de React). Si no se ha publicado en EC2, responde 404.
    root /opt/agenda-facil/frontend;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    location /assets/ {
        try_files $uri =404;
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        add_header X-Content-Type-Options nosniff always;
    }

    location / {
        try_files $uri /index.html =404;
        add_header Cache-Control "no-cache" always;
        add_header X-Content-Type-Options nosniff always;
        add_header X-Frame-Options SAMEORIGIN always;
        add_header Referrer-Policy strict-origin-when-cross-origin always;
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
