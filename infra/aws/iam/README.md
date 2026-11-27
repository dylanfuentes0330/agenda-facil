# Políticas IAM de mínimo privilegio (arquitectura objetivo)

| Archivo | Se asigna a | Permite |
|---|---|---|
| `rol-confianza-ec2.json` | Rol `agenda-facil-api-role` | Que EC2 asuma el rol (perfil de instancia). |
| `politica-api-ec2-s3-uploads.json` | Rol de la instancia EC2 | Solo leer/escribir/borrar objetos bajo `logos/` del bucket de archivos. |
| `politica-ci-despliegue-frontend.json` | Usuario/rol de GitHub Actions | Sincronizar el bucket del frontend e invalidar **una** distribución de CloudFront. |

Reemplaza `ACCOUNT_ID` y `DISTRIBUTION_ID` por los valores reales.

## Limitación de AWS Academy Learner Lab

En el Learner Lab **no se pueden crear usuarios, roles ni políticas IAM**. Por eso:

- La instancia EC2 usa el perfil preexistente **`LabInstanceProfile`** (rol `LabRole`), que tiene
  permisos más amplios que los definidos aquí.
- GitHub Actions usa las **credenciales temporales** de la sesión del laboratorio
  (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`), que caducan al terminar la sesión.

Estas políticas documentan el diseño de mínimo privilegio que se aplicaría en una cuenta AWS
estándar (y en producción real se reemplazarían las claves de CI por OIDC de GitHub → rol IAM).
Los demás controles de mínimo privilegio sí se aplican en la plantilla: RDS sin acceso público
y accesible solo desde el security group de EC2, buckets S3 privados con *Block Public Access*,
acceso de CloudFront al bucket mediante OAC limitado a la distribución, SSH solo con llave,
IMDSv2 obligatorio y usuario de base de datos de aplicación con privilegios solo sobre `agenda_facil`.
