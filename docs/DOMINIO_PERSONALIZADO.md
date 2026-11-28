# Dominio personalizado, DNS y control de acceso (criterio 7)

## 1. Estado actual (verificado el 2026-11-28)

| Requisito de la rúbrica | Estado | Evidencia |
|---|---|---|
| URL pública accesible por HTTPS | **Cumple** | <https://52-54-96-26.sslip.io> con certificado válido de Let's Encrypt (vence 2027-02-25), renovación automática (`certbot-renew.timer`) y simulacro de renovación |
| Dominio personalizado y configuración DNS | **No cumple todavía** | `52-54-96-26.sslip.io` es un nombre del servicio DNS gratuito *sslip.io*, que se limita a devolver la IP incluida en el nombre. **No es un dominio propio registrado** y contiene la IP, que la rúbrica excluye |
| Primera vista: landing page o login antes del dashboard | **Cumple** | `/` es una landing page (`docs/capturas/aws/prod-00-primera-vista-landing.png`); `/panel` sin sesión redirige a `/ingresar` (`prod-18-panel-sin-sesion-redirige-login.png`) |
| El servicio no queda abierto al público | **Cumple** | La API responde 401 sin token y 403 con un rol incorrecto (`docs/evidencias/verificacion-produccion.txt`); el E2E verifica que un cliente no entra al panel |

## 2. Opciones para obtener el dominio

La rúbrica indica usar el **GitHub Student Developer Pack** con el correo institucional. Según la información pública
consultada (noviembre de 2026; confirmar la oferta vigente en <https://education.github.com/pack>):

| Opción | Costo | Requisitos | Observación |
|---|---|---|---|
| **.TECH** (get.tech) vía Student Pack | Gratis el primer año | Student Pack aprobado | Es la opción del ejemplo de la rúbrica (`stockwise.tech`). La renovación es costosa: tratarlo como dominio del curso |
| **Namecheap** vía Student Pack | Dominio `.me` gratis 1 año | Student Pack aprobado, cuenta en Namecheap | Incluye DNS gestionado |
| **Name.com** vía Student Pack | Un dominio gratis 1 año (extensiones como `.live`, `.studio`) | Student Pack aprobado; puede pedir tarjeta y renovar automáticamente al precio normal | Desactivar la renovación automática |

**No se compró ni se registró nada.** Registrar un dominio exige crear una cuenta, aceptar los términos del registrador y,
en algunos casos, una tarjeta: es una acción del propietario.

## 3. Pasos una vez obtenido el dominio (ejemplo: `agendafacil.tech`)

1. En el panel DNS del registrador crear dos registros **A** (TTL 300):

| Nombre | Tipo | Valor |
|---|---|---|
| `@` (raíz) | A | `52.54.96.26` |
| `www` | A | `52.54.96.26` |

2. Comprobar la propagación desde el portátil:

```powershell
nslookup agendafacil.tech
```

3. Emitir el certificado para ambos nombres (el script es idempotente y ya se probó en producción):

```bash
scp -i labsuser.pem infra/aws/ec2/configurar-https.sh ec2-user@52.54.96.26:/tmp/
ssh -i labsuser.pem ec2-user@52.54.96.26 'sudo bash /tmp/configurar-https.sh agendafacil.tech www.agendafacil.tech'
```

4. Actualizar la variable `PUBLIC_ORIGIN` de GitHub a `https://agendafacil.tech` (se usa para CORS y para la verificación
   del Deploy) y volver a desplegar (*Actions → Deploy → Run workflow* desde `main`, aprobar *production*).
5. Verificar:

```bash
curl -sI http://agendafacil.tech/ | head -3          # 301 → https
curl -s https://agendafacil.tech/api/health          # "database":"ok"
node e2e/verificar-produccion.mjs https://agendafacil.tech
```

6. Actualizar README, `SUSTENTACION/EXPLICACION_AWS.md` y este documento con el dominio y las capturas del panel DNS.

Con Route 53 (opcional, ≈ USD 0,50/mes por zona): crear la zona alojada, poner sus 4 servidores NS en el registrador y crear
los mismos registros A en Route 53. No es necesario para cumplir el criterio.

## 4. Por qué no se cambió la URL de producción

La URL actual funciona y está verificada. Se mantendrá hasta que el dominio exista, resuelva a la IP elástica y tenga
certificado válido; el certificado de `sslip.io` sigue siendo válido mientras tanto.
