# Despliegue de producción

Cómo desplegar SGTG en un servidor con `docker-compose.prod.yml`. Para desarrollo se sigue usando
`docker-compose.yml` (http://localhost:4200).

## Qué cambia frente a desarrollo
| | Desarrollo (`docker-compose.yml`) | Producción (`docker-compose.prod.yml`) |
|---|---|---|
| Acceso | HTTP en el puerto 4200 | Solo HTTPS (443); el puerto 80 redirige |
| Puertos publicados | Nginx, backend (8080) y MySQL (3307) | Solo Nginx |
| Secretos | Contraseñas de MySQL en el archivo | En `.env.prod`, fuera del repositorio |
| Usuario de MySQL de la aplicación | `root` | `sgtg_app`: solo lee y escribe datos, solo por TLS |
| Esquema de la base | Lo ajusta la aplicación (`ddl-auto=update`) | Lo ajusta el paso de migración; la aplicación solo lo valida |
| Reloj ajustable | Activo | Apagado |
| Logs | Sin límite | Rotan: 10 archivos de 20 MB por servicio |

En los dos, la auditoría de MySQL tiene triggers que impiden modificarla o borrarla.

## Requisitos
- Un servidor con Docker y Docker Compose, con los dos repositorios como carpetas hermanas
  (`sgtg_backend/` y `sgtg_frontend/`).
- Un dominio que apunte al servidor y su certificado TLS. Se usa el que entregue la Universidad, o uno de Let's
  Encrypt (más abajo).
- Los puertos 80 y 443 abiertos hacia el servidor. El 3306 y el 8080 no deben abrirse.

## Primera vez
Desde `sgtg_frontend/`:

1. **Secretos:** copiar `.env.prod.example` como `.env.prod` y llenarlo.
   - Cada clave se genera con el comando que indica el archivo.
   - Guardar una copia segura fuera del servidor: sin `JWT_SECRET` las sesiones se cierran, y sin
     `SGTG_AUDITORIA_CLAVE` la auditoría anterior ya no se puede verificar.
2. **Certificado:** dejarlo en `certificados/fullchain.pem` y `certificados/privkey.pem`.
3. **Construir:**
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.prod build
   ```
4. **Migrar:** crea la base, el usuario `sgtg_app`, el esquema, los triggers de la auditoría y el administrador
   inicial, y termina.
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm migracion
   ```
5. **Arrancar:**
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
   ```
6. **Revisar** que el log diga "Auditoría íntegra":
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.prod logs backend | grep "Auditoría"
   ```
   Luego entrar con el administrador inicial y cambiar su contraseña.

Después se pueden borrar `SGTG_ADMIN_EMAIL` y `SGTG_ADMIN_PASSWORD` de `.env.prod`.

## Actualizar a una versión nueva
```bash
git -C ../sgtg_backend pull && git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod build
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm migracion
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```
- **La migración siempre va antes:** si la versión nueva cambió el esquema, la aplicación no arranca hasta que se
  migre (`ddl-auto=validate`).
- **Primera vez con la sesión de renovación** (2026-10-31): todos los usuarios vuelven a iniciar sesión una vez.

## Certificado con Let's Encrypt
Con el sitio ya arrancado, Nginx responde los desafíos desde `acme/`:
```bash
docker run --rm -v "$PWD/acme:/var/www/acme" -v "$PWD/letsencrypt:/etc/letsencrypt" certbot/certbot \
  certonly --webroot -w /var/www/acme -d sgtg.ejemplo.edu.co --agree-tos -m soporte@ejemplo.edu.co
cp letsencrypt/live/sgtg.ejemplo.edu.co/fullchain.pem letsencrypt/live/sgtg.ejemplo.edu.co/privkey.pem certificados/
docker compose -f docker-compose.prod.yml --env-file .env.prod exec web nginx -s reload
```
- **El primer arranque** necesita algún certificado en `certificados/`; sirve el de prueba de
  `scripts/certificado-local.sh`.
- **Renovación:** el certificado vence a los 90 días. Repetir el comando (por ejemplo con un cron mensual) y
  recargar Nginx.

## Probar en el propio equipo
Sin dominio, con un certificado autofirmado y otros puertos, para no chocar con el entorno de desarrollo:
```bash
bash scripts/certificado-local.sh
# En .env.prod: SGTG_PUERTO_HTTP=8088 y SGTG_PUERTO_HTTPS=8443
docker compose -f docker-compose.prod.yml --env-file .env.prod build
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm migracion
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
# https://localhost:8443 (el navegador advierte que el certificado no es de confianza)
docker compose -f docker-compose.prod.yml --env-file .env.prod down -v   # al terminar: borra también los datos
```

## Copias de seguridad
Se respaldan tres cosas:
- **La base:**
  ```bash
  docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T mysql \
    sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --triggers sgtg' > respaldo.sql
  ```
- **Los archivos:** el volumen `sgtg-prod_archivos_data`.
- **`.env.prod`:** guardado fuera del servidor.

La verificación nocturna de la auditoría escribe en el log el último sello. Conservar ese log fuera del servidor
permite demostrar, más adelante, que no se borraron registros.
