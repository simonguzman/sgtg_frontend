# SgtgPrueba

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.3.1.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

---

## Docker: sistema completo (base de datos + backend + frontend)

`docker-compose.yml` levanta los tres servicios con un solo comando:

| Servicio | Contenido | Puerto |
|---|---|---|
| `web` | Angular compilado servido por Nginx; reenvía `/api` al backend | http://localhost:4200 |
| `backend` | Spring Boot (`../sgtg_backend`) | http://localhost:8080 (para Thunder Client) |
| `mysql` | MySQL 8 | 3307 |

### Requisitos
- Docker Desktop en ejecución.
- Los dos repositorios como carpetas hermanas: `sgtg_backend/` y `sgtg_frontend/`.
- El archivo `sgtg_backend/.env` con el administrador inicial (copiar `sgtg_backend/.env.example`).
- Los puertos 4200, 8080 y 3307 libres: detener `ng serve` y el `docker compose` propio del backend si están corriendo.

### Comandos (desde `sgtg_frontend`)

```bash
# Solo la primera vez: crear el .env del backend y ajustar el correo y la clave del administrador
cp ../sgtg_backend/.env.example ../sgtg_backend/.env

# Si estaba corriendo el compose del backend solo, detenerlo (usa los mismos puertos)
docker compose -f ../sgtg_backend/docker-compose.yml down

# Construir y levantar todo
docker compose up --build -d

# Ver el estado y seguir el arranque del backend (listo cuando aparece "Started BackendApplication")
docker compose ps
docker compose logs -f backend

# Detener (conserva la base de datos y los archivos en volúmenes)
docker compose down

# Detener y borrar también los datos (base de datos y PDF)
docker compose down -v
```

Abre http://localhost:4200 e inicia sesión con el administrador del `.env`.

Notas:
- La base de datos conserva los datos entre reinicios (`ddl-auto=update` en Docker; las pruebas del backend usan `create-drop`). Para empezar de cero: `docker compose down -v`. Los PDF quedan en el volumen `archivos_data`.
- Nginx admite peticiones de hasta 65 MB (PDF de hasta 20 MB; la solicitud de sustentación lleva hasta cuatro).
- Para desarrollar con recarga en caliente, usa `ng serve` (proxy a `localhost:8080`, ver `proxy.conf.json`) con el backend del `docker compose` de `sgtg_backend`.
