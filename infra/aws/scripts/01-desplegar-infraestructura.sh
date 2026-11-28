#!/usr/bin/env bash
# Crea o actualiza toda la infraestructura con CloudFormation.
# Uso:
#   export DB_MASTER_PASSWORD='ContraseñaSegura123'   # no se guarda en el repositorio
#   bash infra/aws/scripts/01-desplegar-infraestructura.sh
# Variables opcionales: STACK_NAME, AWS_REGION, SSH_CIDR, DOMAIN_NAME, ACM_CERT_ARN, HOSTED_ZONE_ID, PREFIX_LIST_ID,
#   ENABLE_CLOUDFRONT=false (Learner Labs que bloquean CloudFront: Nginx en EC2 sirve el frontend)
set -euo pipefail

STACK_NAME="${STACK_NAME:-agenda-facil}"
REGION="${AWS_REGION:-us-east-1}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
: "${DB_MASTER_PASSWORD:?Define DB_MASTER_PASSWORD (mínimo 12 caracteres: letras, números, _#%+=-)}"

python3 "$DIR/cloudformation/build-template.py"

PARAMS=("DBMasterPassword=$DB_MASTER_PASSWORD" "SSHAllowedCidr=${SSH_CIDR:-0.0.0.0/0}")
[ -n "${DOMAIN_NAME:-}" ] && PARAMS+=("DomainName=$DOMAIN_NAME")
[ -n "${ACM_CERT_ARN:-}" ] && PARAMS+=("AcmCertificateArn=$ACM_CERT_ARN")
[ -n "${HOSTED_ZONE_ID:-}" ] && PARAMS+=("HostedZoneId=$HOSTED_ZONE_ID")
[ -n "${PREFIX_LIST_ID:-}" ] && PARAMS+=("CloudFrontPrefixListId=$PREFIX_LIST_ID")
[ -n "${ENABLE_CLOUDFRONT:-}" ] && PARAMS+=("EnableCloudFront=$ENABLE_CLOUDFRONT")

echo "Desplegando stack $STACK_NAME en $REGION (RDS y CloudFront pueden tardar 15-25 minutos)…"
aws cloudformation deploy \
  --region "$REGION" \
  --stack-name "$STACK_NAME" \
  --template-file "$DIR/cloudformation/agenda-facil.yaml" \
  --parameter-overrides "${PARAMS[@]}" \
  --no-fail-on-empty-changeset

aws cloudformation describe-stacks --region "$REGION" --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs' --output json | tee "$DIR/outputs.json"
echo "Salidas guardadas en infra/aws/outputs.json (archivo ignorado por git)."
