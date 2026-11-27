#!/usr/bin/env bash
# Construye la carpeta ENTREGA_FINAL a partir del repositorio (reproducible).
# Uso: bash scripts/entrega/construir-entrega.sh [rama] [destino]
#   rama    → rama cuyo código se empaqueta (por defecto la rama actual)
#   destino → carpeta de salida (por defecto ../ENTREGA_FINAL). Debe NO existir: el script nunca borra nada.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"
DEST="${2:-$ROOT/../ENTREGA_FINAL}"

if [ -e "$DEST" ]; then
  echo "ERROR: $DEST ya existe. Renómbralo o indica otro destino (este script no borra carpetas)."
  exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
  echo "ERROR: hay cambios sin commit; la entrega debe corresponder exactamente a un commit."
  exit 1
fi

COMMIT=$(git rev-parse --short "$BRANCH")
mkdir -p "$DEST"/{01_DOCUMENTO_ACADEMICO,02_CODIGO_FUENTE,03_DIAGRAMAS,04_DOCUMENTACION_TECNICA,05_GITHUB_CICD,06_INFRAESTRUCTURA_AWS,07_PRUEBAS,08_EVIDENCIAS,09_SUSTENTACION}

# 01 Documento académico
cp docs/documento-academico/Agenda_Facil_Documento_APA.docx docs/documento-academico/Agenda_Facil_Documento_APA.pdf \
   docs/documento-academico/generar_documento.py "$DEST/01_DOCUMENTO_ACADEMICO/"

# 02 Código fuente: ZIP de la rama + bundle con todas las ramas e historial
git archive --format=zip --prefix=agenda-facil/ -o "$DEST/02_CODIGO_FUENTE/agenda-facil-codigo-fuente.zip" "$BRANCH"
git bundle create "$DEST/02_CODIGO_FUENTE/agenda-facil-repositorio.bundle" --all 2>/dev/null
cp README.md "$DEST/02_CODIGO_FUENTE/"
cat > "$DEST/02_CODIGO_FUENTE/LEEME.md" <<EOF
# Código fuente

- \`agenda-facil-codigo-fuente.zip\`: instantánea de la rama \`$BRANCH\` (commit \`$COMMIT\`), sin historial.
- \`agenda-facil-repositorio.bundle\`: repositorio Git completo (ramas \`main\`, \`develop\`, \`feature/*\`,
  \`fix/auditoria-final\`, etiqueta \`v1.0.0-mvp\`). La rama \`fix/auditoria-final\` contiene las correcciones de la
  auditoría y debe integrarse mediante Pull Request (ver \`ESTADO_FINAL.md\`, P1).

Restaurar con todas las ramas: ver el comando exacto en \`ESTADO_FINAL.md\` (P1).
El historial inicial tiene como autor "Claude Code (asistente IA)" y no acredita aportes de integrantes.
EOF

# 03 Diagramas
cp docs/diagramas/* "$DEST/03_DIAGRAMAS/"

# 04 Documentación técnica
cp README.md CONTRIBUTING.md LICENSE AUDITORIA_TECNICA.md docs/arquitectura.md docs/guia-aws-academy.md \
   docs/guia-git-github.md "$DEST/04_DOCUMENTACION_TECNICA/"

# 05 GitHub y CI/CD
mkdir -p "$DEST/05_GITHUB_CICD/.github"
cp -r .github/. "$DEST/05_GITHUB_CICD/.github/"
cp scripts/github/publicar-en-github.sh docs/guia-git-github.md CONTRIBUTING.md "$DEST/05_GITHUB_CICD/"

# 06 Infraestructura AWS
cp -r infra/aws/. "$DEST/06_INFRAESTRUCTURA_AWS/"
cp docs/guia-aws-academy.md "$DEST/06_INFRAESTRUCTURA_AWS/"

# 07 Pruebas
mkdir -p "$DEST/07_PRUEBAS/postman"
cp docs/postman/* "$DEST/07_PRUEBAS/postman/"
cp e2e/mvp-flow.cjs "$DEST/07_PRUEBAS/"
cp docs/evidencias/resultado-*.txt docs/evidencias/resultado-e2e.md docs/evidencias/reejecucion-auditoria.txt "$DEST/07_PRUEBAS/"

# 08 Evidencias
cp -r docs/evidencias "$DEST/08_EVIDENCIAS/"
cp -r docs/capturas "$DEST/08_EVIDENCIAS/capturas_entorno_local"
cp docs/evidencias-requeridas.md "$DEST/08_EVIDENCIAS/"

# 09 Sustentación
cp SUSTENTACION/* "$DEST/09_SUSTENTACION/"

# Raíz
cp ESTADO_FINAL.md docs/CHECKLIST_ENTREGA.md docs/matriz-cumplimiento.md "$DEST/"
cat > "$DEST/LEEME.md" <<EOF
# ENTREGA FINAL — Agenda Fácil

Generada con \`scripts/entrega/construir-entrega.sh\` desde la rama \`$BRANCH\` (commit \`$COMMIT\`).

| Carpeta | Contenido |
|---|---|
| \`01_DOCUMENTO_ACADEMICO\` | Documento APA 7 (DOCX y PDF) y su generador |
| \`02_CODIGO_FUENTE\` | ZIP del código, bundle Git con todas las ramas, README |
| \`03_DIAGRAMAS\` | Arquitectura AWS, componentes, flujo de reservas, E-R, CI/CD, Git (PNG, SVG, Mermaid) |
| \`04_DOCUMENTACION_TECNICA\` | README, auditoría técnica, arquitectura, guías de AWS y Git, CONTRIBUTING, licencia |
| \`05_GITHUB_CICD\` | Workflows, plantillas de PR/issues, Dependabot, script de publicación |
| \`06_INFRAESTRUCTURA_AWS\` | CloudFormation, scripts de EC2 (bootstrap, despliegue, rollback), scripts AWS, políticas IAM |
| \`07_PRUEBAS\` | Colección Postman, prueba E2E y resultados de todas las suites |
| \`08_EVIDENCIAS\` | Evidencias reales (pruebas, simulación de despliegue, validaciones), capturas locales y lista de capturas pendientes |
| \`09_SUSTENTACION\` | Presentación, explicaciones técnicas, 38 preguntas y guion de demostración |
| \`ESTADO_FINAL.md\` | Qué está terminado y qué requiere intervención humana (con pasos exactos) |
| \`CHECKLIST_ENTREGA.md\` · \`matriz-cumplimiento.md\` | Checklist de tareas y matriz de rúbrica |

**Importante:** la aplicación está desarrollada y probada en entorno local; **no está desplegada en AWS**, no hay
dominio y el repositorio no está publicado en GitHub (ver \`ESTADO_FINAL.md\`).
EOF

echo "Entrega generada en $DEST ($(du -sh "$DEST" | cut -f1)) desde $BRANCH@$COMMIT"
