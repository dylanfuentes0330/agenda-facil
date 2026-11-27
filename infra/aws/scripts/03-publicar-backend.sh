#!/usr/bin/env bash
# Publica manualmente el backend en EC2 por SSH (alternativa al workflow Deploy).
# Requiere que /etc/agenda-facil/api.env ya exista en el servidor (ver docs/guia-aws-academy.md).
# Uso: EC2_HOST=1.2.3.4 SSH_KEY=~/labsuser.pem bash infra/aws/scripts/03-publicar-backend.sh
set -euo pipefail
: "${EC2_HOST:?Define EC2_HOST}"
: "${SSH_KEY:?Define SSH_KEY (ruta a la llave .pem)}"
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

git rev-parse --short HEAD > backend/REVISION 2>/dev/null || echo manual > backend/REVISION
tar --exclude=node_modules --exclude=uploads --exclude=tests --exclude=.env -czf /tmp/backend.tar.gz \
  backend infra/aws/ec2/remote-deploy.sh infra/aws/ec2/rollback.sh
rm -f backend/REVISION
scp -i "$SSH_KEY" /tmp/backend.tar.gz "ec2-user@$EC2_HOST:/tmp/backend.tar.gz"
ssh -i "$SSH_KEY" "ec2-user@$EC2_HOST" \
  'rm -rf /tmp/agenda-deploy && mkdir -p /tmp/agenda-deploy && tar -xzf /tmp/backend.tar.gz -C /tmp/agenda-deploy && sudo bash /tmp/agenda-deploy/infra/aws/ec2/remote-deploy.sh /tmp/agenda-deploy/backend'
