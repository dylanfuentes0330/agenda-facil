#!/usr/bin/env bash
# Publica el repositorio local en GitHub con todas sus ramas y configura etiquetas y protección.
# Requisitos: GitHub CLI (gh) autenticado con la cuenta del/la líder (gh auth login).
# Uso: bash scripts/github/publicar-en-github.sh <usuario-u-organizacion> [nombre-repo] [public|private]
set -euo pipefail

OWNER="${1:?Indica el usuario u organización de GitHub}"
REPO="${2:-agenda-facil}"
VISIBILITY="${3:-public}"
FULL="$OWNER/$REPO"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

gh auth status >/dev/null || { echo "Ejecuta primero: gh auth login"; exit 1; }

if ! gh repo view "$FULL" >/dev/null 2>&1; then
  gh repo create "$FULL" "--$VISIBILITY" --description "Agenda Fácil — SaaS de gestión de citas y reservas (React, Node.js, MySQL, AWS)"
fi
git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$FULL.git"

git push -u origin main
for branch in $(git for-each-ref --format='%(refname:short)' refs/heads/ | grep -v '^main$'); do
  git push -u origin "$branch"
done
git push origin --tags

# README: reemplaza OWNER/REPO del badge de CI
if grep -q 'OWNER/REPO' README.md; then
  echo "Recuerda reemplazar OWNER/REPO por $FULL en README.md (commit propio de un integrante)."
fi

echo "Creando etiquetas…"
for label in "frontend:1d76db" "backend:5319e7" "database:0e8a16" "aws:fbca04" "ci-cd:c5def5" "documentation:0075ca"; do
  gh label create "${label%%:*}" --color "${label##*:}" --repo "$FULL" --force >/dev/null
done

echo "Aplicando protección de ramas (requiere permisos de administrador; en cuentas gratuitas, repositorio público)…"
protect() {
  gh api -X PUT "repos/$FULL/branches/$1/protection" --input - >/dev/null <<JSON || echo "  Aviso: no se pudo proteger $1 (configúralo en Settings → Branches)."
{
  "required_status_checks": { "strict": true, "contexts": $2 },
  "enforce_admins": false,
  "required_pull_request_reviews": { "required_approving_review_count": $3 },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
}
CHECKS='["Backend (lint, build, pruebas)", "Frontend (lint, pruebas, build)"]'
protect main "$CHECKS" 1
protect develop "$CHECKS" 0

echo
echo "Listo: https://github.com/$FULL"
echo "Siguientes pasos: invitar colaboradores (Settings → Collaborators) y revisar la pestaña Actions."
