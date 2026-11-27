-- Crea el usuario de APLICACIÓN en Amazon RDS (MySQL), distinto del usuario administrador.
-- Ejecutar UNA vez desde la instancia EC2 (única máquina con acceso de red a RDS):
--   mysql -h <ENDPOINT_RDS> -u <USUARIO_ADMIN> -p < crear-usuario-app.sql
-- Antes de ejecutar, reemplaza CAMBIAR_CLAVE_SEGURA por una contraseña robusta
-- (y guárdala solo en el secreto PROD_DATABASE_URL de GitHub / en /etc/agenda-facil/api.env).
--
-- Privilegios limitados a la base agenda_facil. Incluye DDL (CREATE/ALTER/INDEX/DROP/REFERENCES)
-- porque las migraciones de Prisma se ejecutan con este usuario durante el despliegue.
CREATE DATABASE IF NOT EXISTS agenda_facil CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'agenda_app'@'%' IDENTIFIED BY 'CAMBIAR_CLAVE_SEGURA';
-- Endurecimiento opcional (verificar compatibilidad del conector antes de activarlo):
--   ALTER USER 'agenda_app'@'%' REQUIRE SSL;
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES
  ON agenda_facil.* TO 'agenda_app'@'%';
FLUSH PRIVILEGES;
