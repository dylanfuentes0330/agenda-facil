#!/usr/bin/env bash
# ELIMINA el stack de CloudFormation (EC2, RDS, CloudFront, VPC…) para no consumir créditos.
# RDS deja un snapshot final (DeletionPolicy: Snapshot). Los buckets S3 deben vaciarse antes.
# Acción destructiva: pide confirmación escribiendo el nombre del stack.
set -euo pipefail
STACK_NAME="${STACK_NAME:-agenda-facil}"
REGION="${AWS_REGION:-us-east-1}"

read -r -p "Escribe '$STACK_NAME' para confirmar la ELIMINACIÓN de toda la infraestructura: " answer
[ "$answer" = "$STACK_NAME" ] || { echo "Cancelado."; exit 1; }

for output in FrontendBucketName UploadsBucketName; do
  bucket=$(aws cloudformation describe-stacks --region "$REGION" --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='$output'].OutputValue" --output text)
  if [ -n "$bucket" ] && [ "$bucket" != "None" ]; then
    echo "Vaciando s3://$bucket (incluye versiones)…"
    aws s3 rm "s3://$bucket" --recursive
    for kind in Versions DeleteMarkers; do
      aws s3api list-object-versions --bucket "$bucket" --query "${kind}[].[Key,VersionId]" --output text |
        while read -r key version; do
          if [ -n "$key" ] && [ "$key" != "None" ]; then
            aws s3api delete-object --bucket "$bucket" --key "$key" --version-id "$version" >/dev/null
          fi
        done
    done
  fi
done
aws cloudformation delete-stack --region "$REGION" --stack-name "$STACK_NAME"
echo "Eliminación iniciada. Seguimiento: aws cloudformation describe-stacks --stack-name $STACK_NAME"
