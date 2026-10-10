# Plan de integración por fases del proceso de trabajo de grado

Ya integrados: **login** (`plan-login.md`) y **usuarios** (`integracion-api.md`, sección Usuarios).
Este plan cubre el resto del proceso, en el orden en que avanza un trabajo de grado en el backend
(`Proceso`), para que cada fase se pueda probar de punta a punta con los datos que dejó la anterior.

## 1. Fases en orden de vinculación

| # | Fase (backend) | Etapas `Proceso` | Módulo / pantallas del front | Endpoints (`/api/v1/sgtg/trabajos-grado`) |
|---|---|---|---|---|
| 0 | Base común | — | Servicio único de trabajos de grado, mapeo a las vistas del front, subida (multipart) y descarga de archivos | `GET /mis-trabajos`, `GET ?etapa=`, `GET /{id}`, `GET /{id}/archivos?ruta=` |
| 1 | Propuesta (Comité) | `PROPUESTA` | `proposal`: crear, listar, detalle, editar (nueva versión), evaluar (Comité), evaluaciones realizadas | `POST /investigacion`, `POST /practica-profesional`, `POST /{id}/propuesta`, `POST /{id}/propuesta/decisiones` |
| 2 | Anteproyecto y evaluación | `ANTEPROYECTO`, `EVALUACION` | `preliminary-draft`: registrar, asignar evaluadores (Jefe), evaluar (evaluador), documentos cargados | `POST /{id}/anteproyecto`, `/anteproyecto/evaluadores`, `/anteproyecto/conceptos` |
| 3 | Aprobación del Consejo | `APROBACION_CONSEJO` → `EN_CURSO` | `preliminary-draft`: evaluar presentación (Consejo) | `POST /{id}/anteproyecto/decisiones-consejo` |
| 4 | Trabajo en curso | `EN_CURSO` | `thesis-work`: listado, detalle con plazos, avances / informes mensuales, cambio de título u objetivos | `/cambio-objetivos` (+ `/decisiones-consejo`), `/informes-mensuales` |
| 5 | Solicitudes al Consejo | `PRORROGA`, `SUSPENDIDO`, `CANCELADO` | `thesis-work`: registrar / evaluar solicitud especial | `/prorroga`, `/suspension`, `/suspension/reanudacion`, `/cancelacion` (+ `/decisiones-consejo` de cada una) |
| 6 | Sustentación | `SUSTENTACION`, `APLAZADO`, `FINALIZADO`, `NO_APROBADO` | `thesis-work`: entrega final, paz y salvo, programar sustentación, evaluar, documentos corregidos, correspondencia final | `/sustentacion`, `/programacion`, `/calificaciones`, `/inasistencia`, `/ajustes`, `/ajustes/verificaciones`, `/version-definitiva` |
| 7 | Transversales | todas | historial, estadísticas, notificaciones, vencimientos, formatos descargables | según decisiones (ver §3) |
| 8 | Limpieza | — | retirar mocks, IndexedDB, `EventBus` simulado; colección de Thunder | — |

Las fases 5 y 6 dependen de la 4 (necesitan un trabajo `EN_CURSO`), pero son independientes entre sí.

## 2. Plan por fase

Cada fase se cierra con lo mismo: servicios del front contra el backend, ajustes de DTO en el backend
si hacen falta, pruebas (Jest con `HttpTestingController`, JUnit/MockMvc), prueba de punta a punta
contra Docker por el proxy de `ng serve`, y actualización de `integracion-api.md`.

### Fase 0 — Base común
- `TrabajoGradoApiService` (core): consultas y operaciones del agregado; las operaciones con documento
  envían `FormData` (`archivo` + `datos` JSON).
- Interfaces de `TrabajoGradoDTOResponse` y mapeo a las tres vistas del front (`Proposal`,
  `PreliminaryDraft`, `ThesisWork`) a partir de **un solo trabajo** (ver inquietud A).
- Almacén en memoria (signals) que reemplaza los tres `*-storage.service.ts` sobre IndexedDB,
  cargado con `mis-trabajos` (participantes) y `?etapa=` (Comité, Jefe, Consejo, Administrador).
- Descarga de archivos: `FileDownloadService` con `GET /{id}/archivos?ruta=` (lleva el token).
- Traducción de estados: `Proceso` + `Estado` + resultados → `stateList` del front (tabla en el mapeo).

### Fase 1 — Propuesta
- Formulario: `title` → `titulo`; **objetivos** (el backend los exige; el front solo tiene `description`);
  estudiantes (1–2 TI, 1 PP), codirector, asesor (obligatorio en PP, interno o externo) y **carta de
  aceptación** (PP).
- Crear = `POST /investigacion` o `/practica-profesional` + radicar el formato A (`POST /{id}/propuesta`).
- Comité: `POST /{id}/propuesta/decisiones` (APROBADO / NO_APROBADO, acta opcional, observaciones).
- Editar = radicar una nueva versión (solo tras NO_APROBADO).
- Listados: director/estudiantes con `mis-trabajos`; Comité con `?etapa=PROPUESTA`.

### Fase 2 — Anteproyecto y evaluación
- Registrar = `POST /{id}/anteproyecto` sobre el mismo trabajo (ya en `ANTEPROYECTO`).
- Jefe de departamento: `?etapa=ANTEPROYECTO` y `POST /anteproyecto/evaluadores` (solo el de su departamento: requiere perfil docente, ver inquietud F).
- Evaluadores: `POST /anteproyecto/conceptos` (APROBADO / CON_CORRECCIONES + formato B); correcciones = nueva versión.

### Fase 3 — Aprobación del Consejo
- `?etapa=APROBACION_CONSEJO` y `POST /anteproyecto/decisiones-consejo` (resolución obligatoria).
- Al aprobar, el trabajo pasa a `EN_CURSO`: el front lo muestra como “trabajo de grado”.

### Fase 4 — Trabajo en curso
- Detalle con `ejecucion` (fechas de notificación, fin, mínima de sustentación, límites).
- Cambio de título u objetivos (director) y su decisión (Consejo).
- Informes mensuales (solo PP, director) — ver inquietud C sobre los “avances”.

### Fase 5 — Solicitudes al Consejo
- “Solicitud especial” del front → endpoint por tipo: prórroga (meses 1–3), suspensión (+ reanudación),
  cancelación, cambio de título/objetivos. Evaluación del Consejo → `/decisiones-consejo` de cada uno.

### Fase 6 — Sustentación
- Entrega final (director) = `POST /sustentacion` con formato E, paz y salvo (F) y concepto del asesor (PP).
- Programar (Consejo): jurados, fecha y hora, salón. Calificar (jurado) con acta G; inasistencia.
- Documentos corregidos = ajustes (director) y verificación (jurado). Correspondencia final = versión definitiva H (jurado).

### Fase 7 — Transversales
- Historial: trabajos en etapas finales (`FINALIZADO`, `NO_APROBADO`, `CANCELADO`) y versiones anteriores del propio trabajo.
- Estadísticas, notificaciones y vencimientos según §3.

### Fase 8 — Limpieza
- Eliminar mocks, storages de IndexedDB, `deadline-monitor` local y los roles “en memoria” de usuarios.
- Actualizar la colección de Thunder (multipart, 85 peticiones).

## 3. Inquietudes (decisiones antes o durante cada fase)

| | Inquietud | Recomendación |
|---|---|---|
| A | El front maneja propuesta, anteproyecto y trabajo como **tres entidades** con ids propios; el backend tiene **un solo trabajo** que cambia de etapa. | Usar el **id del trabajo** en las tres vistas (`/proposal/details/15`, `/preliminary-draft/details/15`, `/thesis-work/details/15`) y construir cada vista desde la misma respuesta. Fase 0. |
| B | **Roles de contexto**: el front da acceso a pantallas por roles (EVALUADOR, JURADO, DIRECTOR, CODIRECTOR) que hoy “gana” al participar (simulado). El backend no asigna roles: autoriza por participación. Un docente asignado como evaluador sin rol EVALUADOR no vería “Evaluar anteproyecto”. | Que el **backend agregue el rol** al asignar (director/codirector al crear, evaluador al asignar, jurado al programar) y el front refresque la sesión. Alternativa: guards del front por participación. Antes de la Fase 1. |
| C | **Avances**: el front los carga el estudiante y los evalúan director/codirector/asesor; el backend solo tiene **informes mensuales de PP** que radica el director, sin evaluación. | Decidir: mapear avances a informes mensuales (y quitar la evaluación) o ampliar el backend. Fase 4. |
| D | **Paz y salvo**: en el front lo registra DECANATURA con aprobación académica/financiera; en el backend es un archivo (formato F) que adjunta el director al solicitar la sustentación. DECANATURA no tiene permisos en el backend. | Ajustar el front al flujo del backend, o agregar el registro por Decanatura al backend. Fase 6. |
| E | Funciones del front **sin equivalente** en el backend: eliminar propuesta, editar propuesta en cualquier momento, solicitud especial “nueva fecha de sustentación”, evaluación “Aprobado con observaciones” en la propuesta. | Ocultarlas o adaptarlas al reglamento implementado (p. ej. la segunda sesión la programa el Consejo tras un aplazamiento). Se revisa en cada fase. |
| F | Un **Jefe de departamento** sin rol DIRECTOR/CODIRECTOR no tiene perfil docente (decisión de usuarios) y el backend exige su departamento para asignar evaluadores. | Darle perfil docente (departamento) al Jefe en el formulario de usuarios. Antes de la Fase 2. |
| G | **Notificaciones**: el front las genera localmente con un bus de eventos simulado; el backend no tiene notificaciones. | Corto plazo: derivarlas en el front de los cambios de etapa/plazos del backend. Largo plazo: módulo de notificaciones en el backend. Fase 7. |
| H | **Estadísticas** necesitan todos los trabajos; el backend solo lista por participante o por etapa. | Agregar un endpoint de consulta general (o de estadísticas) para Comité/Consejo/Administrador. Fase 7. |
| I | **Datos de la propuesta**: el backend exige `objetivos` y no guarda `description` ni `lineOfResearch`. | Agregar objetivos al formulario; decidir si el backend guarda descripción y línea de investigación. Fase 1. |
| J | **Descarga**: los archivos ya no son base64; el front debe pedirlos con el token. | Resolver en la Fase 0 con `FileDownloadService`. |
| K | **Vencimientos**: el front los calcula en el navegador (`verifyDeliveryDeadlinesMock`); el backend tiene la tarea programada diaria. | Quitar el cálculo local y confiar en el backend. Fase 7/8. |

## 4. Decisiones tomadas (2026-10-09)

1. **A — Mismo id, tres vistas**: propuesta, anteproyecto y trabajo de grado usan el id del trabajo del backend y se construyen desde la misma respuesta.
2. **B — El backend asigna los roles de contexto**: DIRECTOR (y CODIRECTOR al codirector) al crear el trabajo, EVALUADOR al asignar evaluadores, JURADO al programar la sustentación. El front refresca la sesión (`/usuarios/me`) después de esas operaciones. Se implementa en la fase en que ocurre cada asignación (1, 2 y 6).
3. **I — Propuesta**: el formulario agrega **objetivos**; el backend guarda además **descripción** y **línea de investigación** (opcionales). Fase 1.
4. **F — Jefe de departamento**: con rol JEFE_DEP el formulario de usuarios pide departamento y lo registra como **PLANTA** (se amplía la regla: CODIRECTOR o JEFE_DEP → PLANTA; solo DIRECTOR → OCASIONAL). Antes de la Fase 2.

Pendientes de decidir en su fase: C (avances), D (paz y salvo), E (funciones sin equivalente), G (notificaciones), H (estadísticas), K (vencimientos).
