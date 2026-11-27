#!/usr/bin/env bash
# Publica manualmente el frontend en S3 e invalida CloudFront (alternativa al workflow Deploy).
# Uso: S3_FRONTEND_BUCKET=... CLOUDFRONT_DISTRIBUTION_ID=... bash infra/aws/scripts/02-publicar-frontend.sh
set -euo pipefail
: "${S3_FRONTEND_BUCKET:?Define S3_FRONTEND_BUCKET}"
: "${CLOUDFRONT_DISTRIBUTION_ID:?Define CLOUDFRONT_DISTRIBUTION_ID}"
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

(cd "$ROOT/frontend" && npm ci && npm run build)
aws s3 sync "$ROOT/frontend/dist" "s3://$S3_FRONTEND_BUCKET" --delete --exclude index.html \
  --cache-control "public,max-age=31536000,immutable"
aws s3 cp "$ROOT/frontend/dist/index.html" "s3://$S3_FRONTEND_BUCKET/index.html" --cache-control "no-cache"
aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" --paths "/index.html" "/"
echo "Frontend publicado."
