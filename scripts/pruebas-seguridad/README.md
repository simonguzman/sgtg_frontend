# Pruebas de seguridad (RNF-02)

Corre los 20 casos de seguridad del Anexo 8 sobre una **copia aislada** de SGTG en Docker y deja el
resultado de cada uno con su evidencia. Están escritas en TypeScript con
[Playwright Test](https://playwright.dev/docs/intro). Los casos se verifican de verdad: si una respuesta no es la
esperada, el caso queda como **NO CUMPLE** y el comando termina con error.

Son pruebas de caja negra: no usan el código del front ni del back, sino el sistema desplegado (Nginx, Spring
Boot y MySQL), por la interfaz en el navegador, por el API con `curl` y por la base de datos. Las pruebas
unitarias y de integración siguen en cada proyecto (Jest en el front, JUnit en el back).

## Requisitos

- Docker Desktop, con los dos repositorios como carpetas hermanas (`sgtg_backend` y `sgtg_frontend`).
- `curl` en el PATH (en Windows 10/11 ya viene).
- Las dependencias del front instaladas (`npm install`, incluye `@playwright/test`).
- Microsoft Edge (viene con Windows). Si no está, use Chromium de Playwright:
  `npx playwright install chromium` y corra con `NAVEGADOR=chromium`.

## Cómo correrlas

Desde `sgtg_frontend`:

```bash
npm run test:seguridad
```

La primera vez tarda unos 10 minutos, porque construye las imágenes de la copia aislada.

Opciones, con variables de entorno (en PowerShell: `$env:REUSAR='1'; npm run test:seguridad`):

| Variable | Efecto |
|---|---|
| `REUSAR=1` | No borra los datos de la copia al empezar (arranca más rápido) |
| `DEJAR_ARRIBA=1` | No detiene la copia al terminar (para mostrarla en http://localhost:4220) |
| `SIN_LEVANTAR=1` | La copia ya está arriba: ni la levanta ni la detiene |
| `NAVEGADOR=chromium` | Usa el Chromium de Playwright en vez de Edge |

Para correr solo algunos casos: `npm run test:seguridad -- -g "SEG-04|SEG-05"`.

La copia aislada usa sus propios puertos (web en http://localhost:4220, backend en 8095) y su propia base de
datos, así que los bloqueos, el límite por IP y las alertas que provocan las pruebas **no tocan el entorno de
desarrollo** (4200/8080). La primera vez se generan al azar sus claves en `.env.pruebas` (no se sube al
repositorio). Cada corrida crea sus propios usuarios de prueba con el administrador de la copia.

Para borrarla por completo: `docker compose -p sgtgpruebas down -v`.

## Qué deja

En `scripts/pruebas-seguridad/resultados/<fecha>_<hora>/`:

| Archivo | Contenido |
|---|---|
| `resumen.txt` | Cada caso con CUMPLE / NO CUMPLE y lo que se verificó |
| `SEG-xx.txt` | Los comandos que se ejecutaron (curl, MySQL, docker) y su salida real |
| `SEG-xx_terminal.png` | La misma transcripción como imagen, para el anexo |
| `SEG-xx_<nombre>.png` | Capturas del navegador, con la dirección real en la barra superior |
| `reporte/index.html` | Reporte de Playwright con todo lo anterior (`npx playwright show-report <carpeta>/reporte`) |

En la evidencia, los tokens aparecen como `$TOKEN_…`, la URL del API como `$API` y las contraseñas como
asteriscos.

## Archivos

| Archivo | Qué hace |
|---|---|
| `seguridad.e2e.ts` | Los 20 casos (`.e2e.ts` y no `.spec.ts`, para que Jest no los tome) |
| `infra.ts` | Copia aislada, `curl` y MySQL de verdad, transcripción y verificaciones |
| `preparacion.ts` / `cierre.ts` | Levantan la copia y crean los usuarios / la detienen |
| `resumen.ts` | Escribe `resumen.txt` |
| `playwright.config.ts` | Configuración (un solo proceso, en orden) |
| `docker-compose.pruebas.yml` | La copia aislada |

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
| SEG-18 | Integridad de la auditoría | Sellos encadenados; MySQL rechaza UPDATE y DELETE; la verificación de la cadena la reporta íntegra |
| SEG-19 | Alertas de seguridad | Alertas de correo bloqueado y fuerza bruta, y en la bandeja del administrador |
| SEG-20 | Dependencias | `npm audit --omit=dev` sin vulnerabilidades |

## Notas

- **Orden:** los inicios de sesión por Nginx cuentan para el límite por IP, por eso SEG-08 y SEG-19 van al
  final: SEG-08 espera un minuto antes de empezar y SEG-19 otro minuto antes de entrar como administrador.
  Corriendo un caso suelto con `-g`, esas esperas se mantienen.
- **Alertas e integridad:** en la copia las alertas se revisan cada 15 s (`SGTG_ALERTAS_CRON`) y la cadena de la
  auditoría se verifica cada 20 s (`SGTG_INTEGRIDAD_CRON`); en la aplicación, cada 5 minutos y a las 03:30.
- **HTTPS:** la copia corre por HTTP en local. HTTPS con HSTS es parte de la configuración de producción
  (`docker-compose.prod.yml`, ver `docs/despliegue-produccion.md`) y no se evalúa aquí.
- **Pruebas automáticas del backend** relacionadas (JUnit, sin Docker), desde `sgtg_backend`:

  ```powershell
  .\mvnw test "-Dtest=SeguridadIntegracionTest,CredencialesIntegracionTest,SesionIntegracionTest,IntentosAccesoTest,SesionUsuarioTest,ManageSeguridadCUImplAdapterTest" "-Djavax.net.ssl.trustStoreType=Windows-ROOT"
  ```
