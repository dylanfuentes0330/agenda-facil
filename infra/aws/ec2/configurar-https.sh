#!/usr/bin/env bash
# HTTPS en la instancia EC2 cuando no se usa CloudFront (EnableCloudFront=false).
# Emite un certificado gratuito de Let's Encrypt para el nombre DNS público de la IP elástica
# (salida Ec2PublicHostname de CloudFormation, p. ej. 3-210-10-20.sslip.io, o un dominio propio
# que apunte a esa IP) y configura Nginx para redirigir HTTP → HTTPS. Idempotente.
# Requiere el puerto 80 abierto a Internet (validación HTTP-01) y el 443 para servir HTTPS.
#
# Uso: sudo bash configurar-https.sh <nombre-dns>
set -euo pipefail
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

HOST="${1:?Indica el nombre DNS (salida Ec2PublicHostname)}"
if ! printf '%s' "$HOST" | grep -Eq '^[a-z0-9]([a-z0-9.-]{0,251}[a-z0-9])?$'; then
  echo "ERROR: nombre DNS no válido: $HOST"
  exit 1
fi

# Certbot en un entorno virtual de Python (método oficial para sistemas sin snap, como Amazon Linux 2023)
if [ ! -x /opt/certbot/bin/certbot ]; then
  dnf -y install python3 augeas-libs
  python3 -m venv /opt/certbot
  /opt/certbot/bin/pip install --quiet --upgrade pip
  /opt/certbot/bin/pip install --quiet certbot certbot-nginx
  ln -sf /opt/certbot/bin/certbot /usr/local/bin/certbot
fi

# El server_name debe coincidir para que certbot modifique el bloque correcto.
sed -i "s/^\(\s*\)server_name .*;/\1server_name $HOST;/" /etc/nginx/conf.d/agenda-facil.conf
nginx -t && systemctl reload nginx

certbot --nginx --non-interactive --agree-tos --register-unsafely-without-email \
  --domains "$HOST" --redirect --keep-until-expiring

# HSTS solo una vez que HTTPS funciona (6 meses; sin preload porque el nombre puede cambiar).
# Se añade junto a cada bloque de cabeceras del frontend: en Nginx, un add_header dentro de un
# location anula los heredados del server. La API ya envía HSTS desde Express (helmet).
if ! grep -q 'Strict-Transport-Security' /etc/nginx/conf.d/agenda-facil.conf; then
  sed -i 's/^\(\s*\)add_header X-Content-Type-Options nosniff always;/&\n\1add_header Strict-Transport-Security "max-age=15552000" always;/' \
    /etc/nginx/conf.d/agenda-facil.conf
fi
nginx -t && systemctl reload nginx

# Renovación automática (dos veces al día; certbot solo renueva si faltan < 30 días)
cat > /etc/systemd/system/certbot-renew.service <<'UNIT'
[Unit]
Description=Renovación de certificados de Let's Encrypt
[Service]
Type=oneshot
ExecStart=/usr/local/bin/certbot renew --quiet --deploy-hook "systemctl reload nginx"
UNIT
cat > /etc/systemd/system/certbot-renew.timer <<'UNIT'
[Unit]
Description=Renovación periódica de certificados de Let's Encrypt
[Timer]
OnCalendar=*-*-* 03,15:00:00
RandomizedDelaySec=1h
Persistent=true
[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now certbot-renew.timer

# Sin -f: solo se comprueba que TLS funciona (un 404 es normal si el frontend aún no se publicó).
code=$(curl -s -o /dev/null -w '%{http_code}' "https://$HOST/") || { echo "ERROR: https://$HOST no responde"; exit 1; }
echo "HTTPS activo: https://$HOST (HTTP $code)"
