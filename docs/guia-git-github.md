# Guía de Git y GitHub para el equipo

Esta guía permite que cada integrante evidencie su trabajo **desde su propia cuenta**. El historial inicial del
repositorio fue generado con asistencia de IA (autor de los commits: *Claude Code*); **no** se atribuyó a ningún
integrante. Las contribuciones de cada persona deben hacerse con sus propios commits y Pull Requests.

## 1. Perfil de GitHub completo (cada integrante)

- [ ] Foto de perfil, nombre real y biografía breve (carrera, intereses).
- [ ] Correo verificado y configurado en Git local con el mismo correo de la cuenta:

```bash
git config --global user.name "Nombre Apellido"
```

```bash
git config --global user.email "correo-de-la-cuenta-github@ejemplo.com"
```

- [ ] README de perfil (repositorio `usuario/usuario`) — opcional pero recomendado.
- [ ] Repositorio fijado (*pinned*): `agenda-facil`.
- [ ] Autenticación: `gh auth login` o llave SSH (`ssh-keygen -t ed25519`) agregada en *Settings → SSH keys*.

## 2. Crear el repositorio y publicar el código (una sola persona, el/la líder)

Opción A — script automatizado (requiere [GitHub CLI](https://cli.github.com/) autenticado):

```bash
bash scripts/github/publicar-en-github.sh nombre-de-usuario-u-organizacion agenda-facil
```

El script crea el repositorio, sube `main`, `develop` y todas las ramas `feature/*`, define `develop` como rama
por defecto para PRs, crea etiquetas y aplica protección de ramas (si la cuenta lo permite).

Opción B — manual:

1. En GitHub: *New repository* → `agenda-facil` (sin README, porque ya existe).
2. En la carpeta del proyecto:

```bash
git remote add origin https://github.com/USUARIO/agenda-facil.git
```

```bash
git push -u origin --all
```

3. *Settings → Collaborators* → invitar a cada integrante (rol **Write**). Cada integrante acepta la invitación desde su correo o desde <https://github.com/notifications>.

## 3. Protección de ramas (Settings → Branches → Add rule)

- `main`: *Require a pull request before merging* (1 aprobación), *Require status checks* (`Backend (lint, build, pruebas)`, `Frontend (lint, pruebas, build)`, `E2E en navegador (flujo MVP)`), *Do not allow force pushes*.
- `develop`: *Require a pull request* y *Require status checks*.

## 4. Aportes individuales sugeridos (evidencia real de colaboración)

Cada integrante toma **al menos un issue**, trabaja en su rama y abre un Pull Request. Ideas concretas y útiles:

| Integrante | Rama | Tarea sugerida (pequeña y verificable) |
|---|---|---|
| Frontend | `feature/frontend` | Mostrar el logo del negocio en la tarjeta de “Próximas reservas”; o agregar un filtro por servicio en `/panel/citas`. |
| Backend | `feature/backend` | Endpoint `GET /api/business/reservations/export` (CSV de citas) con prueba en `backend/tests/api`. |
| Base de datos | `feature/database` | Migración que agregue `notes` a `services` o un índice adicional, con `npm run db:migrate:dev`. |
| AWS / DevOps | `feature/aws-deployment` | Ejecutar `00-verificar-servicios.sh`, subir `verificacion-servicios.txt` a `docs/evidencias/`, desplegar el stack y documentar outputs (sin secretos). |
| Documentación | `feature/documentation` | Completar integrantes en README y portada APA, insertar capturas reales de AWS. |

Flujo de cada aporte:

```bash
git checkout feature/frontend && git pull origin develop
```

```bash
git add -A && git commit -m "feat(frontend): muestra logo en próximas reservas"
```

```bash
git push origin feature/frontend
```

Abrir PR `feature/frontend → develop`, pedir revisión a otro integrante, esperar CI verde y hacer *merge*.
Al final del sprint: PR `develop → main` (release) que dispara el despliegue.

## 5. Issues y tablero

- Crear issues con las plantillas (*Reporte de error* / *Nueva funcionalidad o tarea*) y asignarlos.
- Opcional: *Projects → New project → Board* con columnas *Por hacer / En progreso / En revisión / Hecho*.

## 6. Evidencias a capturar

Ver [evidencias-requeridas.md](evidencias-requeridas.md): perfil de cada integrante, lista de commits por autor
(*Insights → Contributors*), PRs con revisión, ejecución de Actions en verde, protección de ramas.
