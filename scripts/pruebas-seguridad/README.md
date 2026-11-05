# Pruebas de seguridad (RNF-02)

Corre los 20 casos de seguridad del Anexo 8 sobre una **copia aislada** de SGTG en Docker y deja el
resultado de cada uno con su evidencia. Los casos se verifican de verdad: si una respuesta no es la esperada,
el caso queda como **NO CUMPLE** y el comando termina con código 1.

## Requisitos

- Docker Desktop (y los dos repositorios como carpetas hermanas: `sgtg_backend` y `sgtg_frontend`).
- `curl` en el PATH (en Windows 10/11 ya viene).
- Python 3.10 o superior.
- Node/npm, solo para el caso SEG-20 (`npm audit`).

```bash
pip install -r requirements.txt
python -m playwright install chromium   # solo si no tiene Edge o Chrome
```

`playwright` y `Pillow` son opcionales: sin Playwright, los casos de la interfaz (SEG-01, 02, 03 y 12) quedan
pendientes; sin Pillow no se generan las imágenes, solo las transcripciones.

## Cómo correrlas

Desde esta carpeta (`sgtg_frontend/scripts/pruebas-seguridad`):

```bash
python seguridad.py                  # copia aislada desde cero, los 20 casos y la evidencia (~10 min)
python seguridad.py --reusar         # sin borrar los datos de la copia (arranca más rápido)
python seguridad.py --sin-navegador  # solo API y base de datos
python seguridad.py --dejar-arriba   # no detiene la copia al terminar (para revisarla en el navegador)
```

La copia aislada usa sus propios puertos (web en http://localhost:4220, backend en 8095) y su propia base de
datos, así que los bloqueos, el límite por IP y las alertas que provocan las pruebas **no tocan el entorno de
desarrollo** (4200/8080). La primera vez se generan al azar sus claves en `.env.pruebas` (no se sube al
repositorio). Cada corrida crea sus propios usuarios de prueba con el administrador de la copia.

Para borrarla por completo: `docker compose -p sgtgpruebas down -v`.

## Qué deja

En `resultados/<fecha>_<hora>/`:

| Archivo | Contenido |
|---|---|
| `resumen.txt` | Cada caso con CUMPLE / NO CUMPLE y lo que se verificó |
| `SEG-xx.txt` | Los comandos que se ejecutaron (curl, MySQL, docker) y su salida real |
| `SEG-xx_terminal.png` | La misma transcripción como imagen, para el anexo |
| `SEG-xx_<nombre>.png` | Capturas del navegador, con la dirección real en la barra superior |

En la evidencia, los tokens aparecen como `$TOKEN_…`, la URL del API como `$API` y las contraseñas como
asteriscos.

## Los casos

| ID | Caso | Cómo se verifica |
|---|---|---|
| SEG-01 | Vistas internas sin sesión | Navegador: /users, /thesis-work y /notifications llevan a /auth/login |
| SEG-02 | URL de un rol no autorizado | Navegador: el estudiante que escribe /users o /statistics queda en /notifications |
| SEG-03 | Menú por rol | Navegador: estudiante, director y administrador ven solo sus módulos |
| SEG-04 | API sin token | 401 sin datos |
| SEG-05 | API con un rol no autorizado | 403 al estudiante, 200 al administrador |
| SEG-06 | Token alterado o falsificado | Rol cambiado, sin firma (`alg: none`) e inventado: 401 |
| SEG-07 | Bloqueo por intentos | El 5.º fallo bloquea el correo 15 min; la contraseña correcta también se rechaza |
| SEG-08 | Límite por IP (Nginx) | De 30 intentos seguidos, los últimos reciben 429 y quedan en el log de Nginx |
| SEG-09 | Respuestas que no revelan cuentas | Correo inexistente y contraseña incorrecta: misma respuesta; inyección SQL rechazada |
| SEG-10 | Token y cookie de renovación | Token de 15 min; cookie HttpOnly, Secure y SameSite=Strict |
| SEG-11 | Cierre de sesión | El token deja de servir (401) |
| SEG-12 | Cierre por inactividad | Navegador: se adelanta el reloj 31 min y aparece el aviso |
| SEG-13 | Cambio obligatorio de contraseña | 403 `GC-0012` en el API; la interfaz no deja salir de /auth/cambiar-password |
| SEG-14 | Política de contraseñas | Claves débiles rechazadas con 400; el formulario no se puede enviar |
| SEG-15 | Almacenamiento de contraseñas | Hashes BCrypt de costo 12; `users` sin columnas de contraseña |
| SEG-16 | Archivos que no son PDF | Contenido o extensión falsos: 400; 70 MB: 413 |
| SEG-17 | Cabeceras de seguridad | CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| SEG-18 | Integridad de la auditoría | Sellos encadenados; MySQL rechaza UPDATE y DELETE; verificación al arrancar |
| SEG-19 | Alertas de seguridad | Alertas de correo bloqueado y fuerza bruta, y en la bandeja del administrador |
| SEG-20 | Dependencias | `npm audit --omit=dev` sin vulnerabilidades |

## Notas

- **Orden:** los inicios de sesión por Nginx cuentan para el límite por IP, por eso SEG-08 se corre al final y
  antes espera un minuto; después espera otro minuto para entrar como administrador y ver las alertas.
- **Alertas:** en la copia se revisan cada 15 s (`SGTG_ALERTAS_CRON`); en la aplicación, cada 5 minutos.
- **HTTPS:** la copia corre por HTTP en local. HTTPS con HSTS es parte de la configuración de producción
  (`docker-compose.prod.yml`, ver `docs/despliegue-produccion.md`) y no se evalúa aquí.
- **Pruebas automáticas del backend** relacionadas (JUnit, sin Docker), desde `sgtg_backend`:

  ```powershell
  .\mvnw test "-Dtest=SeguridadIntegracionTest,CredencialesIntegracionTest,SesionIntegracionTest,IntentosAccesoTest,SesionUsuarioTest,ManageSeguridadCUImplAdapterTest" "-Djavax.net.ssl.trustStoreType=Windows-ROOT"
  ```
