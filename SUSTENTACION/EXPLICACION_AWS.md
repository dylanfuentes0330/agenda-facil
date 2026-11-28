# Arquitectura AWS — explicación para la sustentación

> Estado real: la infraestructura está **definida y validada** (CloudFormation + cfn-lint; scripts ensayados en
> simulación local), pero **no desplegada** al momento de redactar este material. Si el equipo despliega antes de la
> sustentación, actualizar esta nota y mostrar la consola.

![Arquitectura](../docs/diagramas/01-arquitectura-aws.png)

| Servicio | Qué es | Qué hace en Agenda Fácil | Configuración clave |
|---|---|---|---|
| **Amazon EC2** | Servidores virtuales | Ejecuta la API Node.js/Express detrás de Nginx, como servicio systemd | t3.micro, Amazon Linux 2023, IP elástica, IMDSv2, disco cifrado; puerto 80 solo desde CloudFront; SSH solo con llave |
| **Amazon RDS (MySQL)** | Base de datos relacional administrada (copias, parches) | Guarda usuarios, negocios, servicios, horarios, clientes y reservas | MySQL 8.4 LTS, db.t3.micro, 20 GB cifrados, **subredes privadas**, `PubliclyAccessible: false`, acceso solo desde el security group de EC2, usuario de aplicación con privilegios limitados |
| **Amazon S3** | Almacenamiento de objetos | (1) Archivos del frontend compilado; (2) logos de los negocios | Ambos **privados** (Block Public Access), cifrado SSE-S3, deniega HTTP sin TLS; el frontend solo lo lee CloudFront (OAC); los logos se entregan con URLs prefirmadas temporales |
| **Amazon CloudFront** | Red de distribución de contenido (CDN) con HTTPS | Puerta de entrada única: sirve el frontend desde S3 y enruta `/api/*` a EC2 | HTTPS obligatorio; caché optimizada para estáticos; sin caché para la API (reenvía `Authorization`); función que redirige rutas de la SPA a `index.html`; cabeceras de seguridad |
| **Amazon Route 53** | DNS administrado | Resuelve el dominio personalizado hacia CloudFront | Registros alias A/AAAA (opcional, requiere dominio y zona alojada) |
| **AWS IAM** | Identidades y permisos | Controla qué puede hacer cada componente | En Learner Lab: perfil `LabInstanceProfile` (no se pueden crear roles). Diseño objetivo de mínimo privilegio en `infra/aws/iam/` |
| **AWS Certificate Manager** (complementario) | Certificados TLS | Certificado del dominio para CloudFront | Debe emitirse en `us-east-1` con validación DNS |
| **AWS CloudFormation** (complementario) | Infraestructura como código | Crea todo lo anterior de forma reproducible | `infra/aws/cloudformation/agenda-facil.yaml` |

## Red (VPC 10.20.0.0/16)
- **2 subredes públicas** (con ruta a Internet Gateway): EC2.
- **2 subredes privadas** (sin ruta a Internet): RDS (exige subredes en 2 zonas de disponibilidad).
- **Security groups**: `web-sg` (80 desde la prefix list de CloudFront, 22 desde el rango autorizado) y `db-sg` (3306 solo desde `web-sg`).

## Recorrido de una petición
1. El navegador pide `https://dominio/panel` → Route 53 → CloudFront → (función SPA) → `index.html` desde S3.
2. React llama `https://dominio/api/business/dashboard` con el token → CloudFront (sin caché) → EC2:80 → Nginx → Node.js:3000.
3. La API consulta RDS por la red privada y responde JSON; CloudFront lo devuelve por HTTPS.

## Limitaciones de AWS Academy y respuesta del diseño
| Limitación | Respuesta |
|---|---|
| No se pueden crear roles IAM | Uso de `LabInstanceProfile`; políticas objetivo documentadas |
| Credenciales temporales | Actualizar secretos de GitHub en cada sesión; despliegue condicionado por `AWS_DEPLOY_ENABLED` |
| Sesiones limitadas, recursos se detienen | IP elástica; iniciar el laboratorio antes de la demostración |
| No se registran dominios | Registrador externo + Route 53 o CNAME |
| Créditos limitados | Recursos micro, Single-AZ, script de eliminación (ejecutar solo con decisión del equipo) |

## Costos
La propuesta estimó **USD 43.26/mes** (EC2 7.59, RDS 14.71, S3 9.46, CloudFront 11.00, Route 53 0.50). Son
**estimaciones** de AWS Pricing Calculator, no una cotización vigente; en Learner Lab el consumo sale de los créditos del curso.

## Escalabilidad
La API no guarda estado de sesión (JWT), por lo que puede ejecutarse en varias instancias detrás de un balanceador
(Application Load Balancer + Auto Scaling). RDS puede crecer verticalmente, activar Multi-AZ y réplicas de lectura;
S3 y CloudFront escalan automáticamente. El bloqueo por negocio en la base de datos sigue garantizando la ausencia de
dobles reservas con varias instancias, porque el candado está en MySQL y no en la memoria del servidor.
