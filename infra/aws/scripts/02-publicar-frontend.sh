#!/usr/bin/env bash
# Publica manualmente el frontend (alternativa al workflow Deploy). Dos modos:
#   - CloudFront (EnableCloudFront=true): sincroniza en S3 e invalida CloudFront.
#       S3_FRONTEND_BUCKET=... CLOUDFRONT_DISTRIBUTION_ID=... bash infra/aws/scripts/02-publicar-frontend.sh
#   - EC2 (EnableCloudFront=false): copia frontend/dist a la instancia y Nginx lo sirve.
#       EC2_HOST=1.2.3.4 SSH_KEY=~/labsuser.pem bash infra/aws/scripts/02-publicar-frontend.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

if [ -n "${CLOUDFRONT_DISTRIBUTION_ID:-}" ]; then
  : "${S3_FRONTEND_BUCKET:?Define S3_FRONTEND_BUCKET}"
  (cd "$ROOT/frontend" && npm ci && npm run build)
  aws s3 sync "$ROOT/frontend/dist" "s3://$S3_FRONTEND_BUCKET" --delete --exclude index.html \
    --cache-control "public,max-age=31536000,immutable"
  aws s3 cp "$ROOT/frontend/dist/index.html" "s3://$S3_FRONTEND_BUCKET/index.html" --cache-control "no-cache"
  aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" --paths "/index.html" "/"
else
  : "${EC2_HOST:?Define CLOUDFRONT_DISTRIBUTION_ID (modo CloudFront) o EC2_HOST (modo EC2)}"
  : "${SSH_KEY:?Define SSH_KEY (ruta a la llave .pem)}"
  (cd "$ROOT/frontend" && npm ci && npm run build)
  TMP_TAR="$(mktemp)"
  tar -czf "$TMP_TAR" -C "$ROOT" frontend/dist infra/aws/ec2/remote-frontend.sh
  scp -i "$SSH_KEY" "$TMP_TAR" "ec2-user@$EC2_HOST:/tmp/frontend.tar.gz"
  rm -f "$TMP_TAR"
  ssh -i "$SSH_KEY" "ec2-user@$EC2_HOST" \
    'rm -rf /tmp/agenda-frontend && mkdir -p /tmp/agenda-frontend && tar -xzf /tmp/frontend.tar.gz -C /tmp/agenda-frontend && sudo bash /tmp/agenda-frontend/infra/aws/ec2/remote-frontend.sh /tmp/agenda-frontend/frontend/dist'
fi
echo "Frontend publicado."
