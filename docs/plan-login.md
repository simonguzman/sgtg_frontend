# Plan de integración del login (front ↔ sgtg_backend)

## 1. Estado actual

### Backend
- `POST /api/v1/sgtg/auth/login` con `{ email, password }` (sin `@Valid`) → `{ token }`. Única ruta pública.
- JWT HS256, `sub` = email, claim `roles` = claves (`ADMINISTRADOR`, `JEFE_DEP`…), vence a las **24 h**, sin refresh token.
- Rutas protegidas: `Authorization: Bearer <token>`. Sin token o con token inválido/vencido → **401** sin cuerpo; sin rol → **403**.
- Datos del usuario: `GET /api/v1/sgtg/usuarios/me` → `{ id: Long, codigo, tipoDocumento: CC|CE|PASAPORTE, numeroDocumento, email, primerNombre, segundoNombre, primerApellido, segundoApellido, roles: string[] }`.
- Errores de login poco uniformes:
  - correo inexistente → **406** `"ERROR, NO DATA, No se encontró un usuario con el correo proporcionado."`
  - contraseña incorrecta → **404** `"ERROR, BAD CREDENTIALS, Bad credentials"` (mensaje de Spring sin traducir)
  - Además, los dos mensajes distintos permiten saber qué correos existen.
- **No existe**: cambio de contraseña, estado activo/inactivo del usuario, cierre de sesión en servidor (no hace falta: es stateless), CORS.

### Frontend
- `AuthApiService.login` busca el usuario y la contraseña en la lista local (`sgtg_users`) y guarda el `User` completo, **con contraseña**, en `localStorage['sgtg_session']`.
- `AuthService` (fachada) expone `currentUser`, `isAuthenticated`, `userRoles`, `hasAnyRole`, `login`, `logout`, `changePassword`. ~40 archivos usan `currentUser()` (sobre todo `.id` y `.roles`).
- Guards: `authGuard` (exige `state === 'Activo'`), `roleGuard` (`route.data.roles` con etiquetas de `UserRoleType`), `publicGuard`, guards de propiedad por `currentUser().id`.
- Hay **dos sesiones duplicadas**: `AuthStorageService` (`sgtg_session`) y `UserStorageService` (`sgtg_current_session`).
- `provideHttpClient()` sin interceptores; `environment.apiUrl` = `http://localhost:8080/api` (dev) y `/api` (prod, nginx hace proxy de `/api/` al backend).

### Compatibilidades que facilitan el cambio
- Las **claves** de `UserRoleType` del front son idénticas a los roles del backend → `UserRoleType[clave]` da la etiqueta.
- Las claves de `IdentificationType` (`CC`, `CE`, `PASAPORTE`) coinciden con `tipoDocumento`.

## 2. Plan

### Fase 0 — Conectividad (sin CORS) ✅
1. `environment.ts` y `environment.prod.ts`: `apiUrl: '/api/v1/sgtg'`.
2. `proxy.conf.json` (`/api` → `http://localhost:8080`) y `"proxyConfig"` en `angular.json` (serve). Así dev y prod son mismo origen (en prod ya lo hace nginx) y el backend no necesita CORS.

### Fase 1 — Ajustes del backend ✅ (hecho el 2026-10-08)
1. Login con `@Valid` y respuesta **uniforme 401** con un solo mensaje ("Correo o contraseña incorrectos.") para correo inexistente o contraseña incorrecta.
2. (Según decisión) `PUT /api/v1/sgtg/usuarios/me/password` `{ passwordActual, passwordNueva }`.
3. (Según decisión) estado activo/inactivo del usuario: `UserEntity.isEnabled()` y login rechazado si está inactivo.
4. Pruebas de integración de cada caso.

Resultado (contrato para el front):
- `POST /auth/login` → 200 `{ token }`; credenciales incorrectas o correo inexistente → **401** `{ errorCode: "GC-0005", message: "Correo o contraseña incorrectos." }`; usuario inactivo (con la contraseña correcta) → **401** `"Tu cuenta se encuentra inhabilitada. Contacta al administrador."`; correo o contraseña vacíos → 400 (mapa de campos).
- `GET /usuarios/me` incluye `activo`. Si el usuario es inactivado, su token deja de servir (401).
- `PUT /usuarios/me/password` `{ passwordActual, passwordNueva }` → 204; actual incorrecta, nueva de menos de 8 caracteres o igual a la actual → **400** con `message`.
- `PUT /usuarios/{id}/estado` `{ activo }` (ADMINISTRADOR) → 200 con el usuario; inactivarse a sí mismo → 400.
- En el front el interceptor no debe cerrar la sesión con el 401 de la petición de login (es un login fallido, no una sesión vencida).

### Fase 2 — Frontend ✅
1. **Modelo y mapeo** (`core/services/auth/`):
   - `UsuarioDTOResponse` (interfaz del backend) y `mapUsuario(dto): User`:
     - `id: String(dto.id)`: se mantiene `string` para no tocar las ~40 comparaciones de ids
     - `idType: IdentificationType[dto.tipoDocumento]`, `idNumber`, `codeNumber`, nombres
     - `roles: dto.roles.map(r => UserRoleType[r])`
     - `state: UserState.active`, porque el backend todavía no maneja estado
   - `User.password` deja de llenarse.
2. **`AuthStorageService`**: guarda `sgtg_token` y el `User` mapeado; agrega `token()`, `tokenExpirado()` (lee `exp` del JWT) y `clear()`. `isAuthenticated` = hay usuario y el token no ha vencido.
3. **`AuthApiService.login`**: `POST {apiUrl}/auth/login` → guarda el token → `GET {apiUrl}/usuarios/me` → `setUser(mapUsuario(...))`. Conserva la firma `Observable<{ success, message? }>` para no tocar `LoginFacadeService`:
   - 400/401/404/406 → `{ success: false, message: 'Correo o contraseña incorrectos.' }`
   - error de red (status 0) → error técnico (lo que ya muestra la fachada)
4. **Interceptor** `authInterceptor` (`provideHttpClient(withInterceptors([...]))`):
   - agrega `Authorization: Bearer` a las peticiones a `apiUrl` (no al login);
   - en **401** limpia la sesión y redirige a `/auth/login?expirada=1`, salvo en la petición de login.
5. **Arranque**: `provideAppInitializer` → si hay token vigente, refresca el usuario con `/usuarios/me` (los roles pueden haber cambiado); si falla con 401, cierra la sesión.
6. **Vencimiento**: temporizador que cierra la sesión al llegar el `exp` del token y muestra el aviso.
7. **Guards**: `authGuard` usa `isAuthenticated()` (token vigente); el chequeo de `state` queda (siempre activo hasta que exista en el backend). `roleGuard` y los de propiedad no cambian gracias al mapeo.
8. **Sesión única**: `UserStorageService` deja de manejar `sgtg_current_session`; `currentUser` sale solo de `AuthStorageService`. Revisar `UserApiService.updateUser/removeRolesFromUsers`, que actualizan el usuario en sesión.
9. **Cambio de contraseña** (header → modal): conectar al endpoint si se crea; si no, ocultar la opción.
10. **Logout**: borra el token y el usuario (sin llamada al backend).

### Fase 3 — Pruebas ✅
- Jest: `auth-api.service.spec`, `auth.service.spec`, `auth-storage.service.spec`, `auth-sync.integration.spec` con `HttpTestingController`; spec nuevo del interceptor y del mapeo.
- Manual: `docker-compose up` del backend + `ng serve`; login con el administrador de `.env`, login fallido, token vencido (con el reloj ajustable o editando el token), usuario sin rol en una ruta protegida.

## Estado (2026-10-08)
Fases 0 a 3 implementadas. Jest: 264 suites / 2100 pruebas en verde; `ng build` compila; login probado de punta a punta contra el backend en Docker a través del proxy de `ng serve`.

Archivos principales: `core/services/auth/*`, `core/interceptors/auth.interceptor.ts`, `core/mappers/usuario.mapper.ts`, `core/interfaces/api/auth-api.interface.ts`, `core/utils/jwt-utils.ts`, `app.config.ts`, `proxy.conf.json`, `environments/*`.

Pendiente / a tener en cuenta:
- Los demás módulos siguen con datos simulados (`sgtg_users`, IndexedDB): el id del usuario autenticado es el del backend (ej. `"1"`) y no coincide con los ids de los mocks hasta integrar cada módulo.
- `User.codeNumber` e `idNumber` son números en el front y texto en el backend; un código no numérico (ej. `ADMIN`) se muestra como 0. Conviene pasarlos a `string` al integrar el módulo de usuarios.
- La gestión de usuarios (`softDeleteUser` → `PUT /usuarios/{id}/estado`) se conecta con el módulo de usuarios.

## 3. Decisiones (2026-10-08)
1. **Login fallido → 401 uniforme** en el backend, con un solo mensaje ("Correo o contraseña incorrectos."), exista o no el correo.
2. **Cambio de contraseña → endpoint nuevo** `PUT /api/v1/sgtg/usuarios/me/password` `{ passwordActual, passwordNueva }`; el front conecta el modal existente del header.
3. **Estado activo/inactivo → se agrega al backend**: campo `activo` en el usuario (por defecto `true`), `UserEntity.isEnabled()` lo usa (un inactivo no inicia sesión y su token deja de servir), `UsuarioDTOResponse.activo` y endpoint del administrador `PUT /api/v1/sgtg/usuarios/{id}/estado` `{ activo }` (lo usará `softDeleteUser` del módulo de usuarios). El login de un inactivo responde con su propio mensaje ("Tu cuenta se encuentra inhabilitada…"), que el front ya muestra; el mapeo usa `state = activo ? Activo : Inactivo`.
4. **Token en `localStorage`** (`sgtg_token`).

Con esto la Fase 1 incluye los puntos 1 a 3 del backend como obligatorios.
