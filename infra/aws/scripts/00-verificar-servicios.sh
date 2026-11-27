#!/usr/bin/env bash
# Verifica (solo LECTURA, no crea nada) qué servicios permite la sesión actual de AWS Academy.
# Requiere AWS CLI v2 configurada con las credenciales temporales del Learner Lab ("AWS Details").
# Guarda el resultado en verificacion-servicios.txt como evidencia.
set -uo pipefail
REGION="${AWS_REGION:-us-east-1}"
OUT="verificacion-servicios.txt"

check() {
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then echo "[OK]        $name"; else echo "[BLOQUEADO] $name  →  $*"; fi
}

{
  echo "Verificación de servicios AWS — $(date -u +%Y-%m-%dT%H:%M:%SZ) — región $REGION"
  aws sts get-caller-identity --query Arn --output text 2>&1 | sed 's/^/Identidad: /'
  check "EC2 (describe-instances)"            aws ec2 describe-instances --region "$REGION" --max-items 1
  check "EC2 key pair vockey"                 aws ec2 describe-key-pairs --region "$REGION" --key-names vockey
  check "Perfil IAM LabInstanceProfile"        aws iam get-instance-profile --instance-profile-name LabInstanceProfile
  check "RDS (describe-db-instances)"          aws rds describe-db-instances --region "$REGION" --max-items 1
  check "RDS motores MySQL 8.4"                aws rds describe-db-engine-versions --region "$REGION" --engine mysql --engine-version 8.4 --max-items 1
  check "S3 (list-buckets)"                    aws s3api list-buckets
  check "CloudFront (list-distributions)"      aws cloudfront list-distributions --max-items 1
  check "CloudFront functions"                 aws cloudfront list-functions --max-items 1
  check "Route 53 (list-hosted-zones)"         aws route53 list-hosted-zones --max-items 1
  check "ACM us-east-1 (list-certificates)"    aws acm list-certificates --region us-east-1 --max-items 1
  check "CloudFormation (list-stacks)"         aws cloudformation list-stacks --region "$REGION" --max-items 1
  check "SSM parámetro AMI Amazon Linux 2023"  aws ssm get-parameters --region "$REGION" --names /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64
  echo
  echo "Prefix list de CloudFront (origin-facing) en $REGION:"
  aws ec2 describe-managed-prefix-lists --region "$REGION" \
    --filters Name=prefix-list-name,Values=com.amazonaws.global.cloudfront.origin-facing \
    --query 'PrefixLists[0].PrefixListId' --output text 2>&1
  echo
  echo "Nota: [OK] en una operación de lectura no garantiza permiso de creación; el despliegue real lo confirma."
} | tee "$OUT"
