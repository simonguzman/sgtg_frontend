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

### Fase 0 — Base común ✅ (2026-10-09)
Hecho: `core/interfaces/api/trabajo-grado-api.interface.ts`, `core/services/trabajo-grado/trabajo-grado-api.service.ts`
(consultas, `enviarJson`, `enviarArchivos`, `urlArchivo`), `trabajo-grado-store.service.ts` (carga al iniciar sesión:
todos los trabajos para Comité/Jefe/Consejo/Administrador con el nuevo `GET /trabajos-grado` sin etapa, los propios
para los demás), `core/mappers/trabajo-grado.mapper.ts` (las tres vistas con el id del trabajo, estados, documentos,
evaluaciones y fechas locales) y `FileDownloadService` (los archivos del backend se piden como blob con el token).
Los módulos aún usan sus storages simulados: cada fase los conecta al almacén.

- `TrabajoGradoApiService` (core): consultas y operaciones del agregado; las operaciones con documento
  envían `FormData` (`archivo` + `datos` JSON).
- Interfaces de `TrabajoGradoDTOResponse` y mapeo a las tres vistas del front (`Proposal`,
  `PreliminaryDraft`, `ThesisWork`) a partir de **un solo trabajo** (ver inquietud A).
- Almacén en memoria (signals) que reemplaza los tres `*-storage.service.ts` sobre IndexedDB,
  cargado con `mis-trabajos` (participantes) y `?etapa=` (Comité, Jefe, Consejo, Administrador).
- Descarga de archivos: `FileDownloadService` con `GET /{id}/archivos?ruta=` (lleva el token).
- Traducción de estados: `Proceso` + `Estado` + resultados → `stateList` del front (tabla en el mapeo).

### Fase 1 — Propuesta ✅ (2026-10-09)
Hecho en el backend: el trabajo guarda `descripcion` y `lineaInvestigacion` (opcionales); al crear asigna los
roles DIRECTOR / CODIRECTOR / ASESOR (`ManageUserGatewayIntPort.agregarRol`); nuevo `PUT /{id}/propuesta`
(título, objetivos, descripción y línea) solo para el director y solo antes de radicar o tras un NO APROBADO.

Hecho en el front:
- `ProposalStorageService` es la vista `propuestas` de `TrabajoGradoVistasService` (sin IndexedDB);
  `ProposalApiService` crea (TI con JSON, PP multipart con la carta), radica el formato A, corrige con `PUT`
  y refresca la sesión y los usuarios para tomar los roles nuevos. Eliminar no existe en el backend (se
  cancela ante el Consejo, Fase 5): la acción se quitó de la tabla.
- `ProposalDocumentService`: concepto del Comité (`propuesta/decisiones` con el acta firmada) y nueva
  versión del formato A.
- Formulario: objetivo general + específicos (uno por línea), descripción, línea de investigación,
  organización y carta de aceptación (PP). Al editar, los participantes quedan bloqueados.
- Regla `propuestaEditable` (misma del backend) en la tabla y en la página de edición.
- Errores del backend visibles con `apiErrorMessage`.
- Pruebas: specs reescritas contra `HttpTestingController`; ayuda `testing/sesion-de-prueba.ts`
  (`iniciarSesionConTrabajos`). Se retiraron las de intercambio de roles y eliminación (ahora del backend).
- Verificado de punta a punta contra Docker: TI (crear, corregir, radicar, NO APROBADO, v2, APROBADO →
  ANTEPROYECTO, descargas) y PP (carta reubicada, asesor, formato PP-A).

Nota: el backend responde **403** (desde la fase 8; antes 406) (`NoAccessException`, GC-0008) cuando un usuario no tiene acceso a un
trabajo o archivo; sus pruebas lo esperan así.

Plan original:
- Formulario: `title` → `titulo`; **objetivos** (el backend los exige; el front solo tiene `description`);
  estudiantes (1–2 TI, 1 PP), codirector, asesor (obligatorio en PP, interno o externo) y **carta de
  aceptación** (PP).
- Crear = `POST /investigacion` o `/practica-profesional` + radicar el formato A (`POST /{id}/propuesta`).
- Comité: `POST /{id}/propuesta/decisiones` (APROBADO / NO_APROBADO, acta opcional, observaciones).
- Editar = radicar una nueva versión (solo tras NO_APROBADO).
- Listados: director/estudiantes con `mis-trabajos`; Comité con `?etapa=PROPUESTA`.

### Fase 2 — Anteproyecto y evaluación ✅ (2026-10-11)
Hecho en el backend: el estado del anteproyecto pertenece a cada versión (`VersionDocumento`, igual que la
propuesta; `anteproyecto.versiones[i].estado`) y al asignar evaluadores se les agrega el rol EVALUADOR.

Hecho en el front:
- Prerrequisito (inquietud F): con rol JEFE_DEP el formulario de usuarios pide departamento y lo registra
  como PLANTA.
- `PreliminaryDraftStorageService` es la vista `anteproyectos` de `TrabajoGradoVistasService` (sin IndexedDB).
  Un trabajo tiene anteproyecto desde que se radica su primera versión.
- Registrar = radicar la versión 1 (`POST /{id}/anteproyecto`); corregir = radicar una nueva versión, solo
  el director y solo tras correcciones de los evaluadores o un NO APROBADO del Consejo.
- Jefe: asigna los evaluadores (`/anteproyecto/evaluadores`) y se refresca la lista de usuarios.
- Evaluador: concepto APROBADO o "Requiere correcciones" (CON_CORRECCIONES; el anteproyecto no se rechaza)
  con el formato B (`/anteproyecto/conceptos`).
- "Documentos cargados": columna Versión y el estado de cada versión; solo el evaluador asignado evalúa la
  versión vigente en revisión.
- Pruebas contra `HttpTestingController`; se retiró la de "evaluador histórico" (el backend no reemplaza
  evaluadores). E2E contra Docker por nginx: asignación, correcciones, versión 2, aprobación y Consejo.

Plan original:
- Registrar = `POST /{id}/anteproyecto` sobre el mismo trabajo (ya en `ANTEPROYECTO`).
- Jefe de departamento: `?etapa=ANTEPROYECTO` y `POST /anteproyecto/evaluadores` (solo el de su departamento: requiere perfil docente, ver inquietud F).
- Evaluadores: `POST /anteproyecto/conceptos` (APROBADO / CON_CORRECCIONES + formato B); correcciones = nueva versión.

### Fase 3 — Aprobación del Consejo ✅ (2026-10-12)
Hecho: la decisión del Consejo (`/anteproyecto/decisiones-consejo`, APROBADO o NO_APROBADO con la
resolución); la fecha máxima de entrega la calcula el backend.

Formato C (decisión del 2026-10-12): aprobado por ambos evaluadores, el anteproyecto queda en el Departamento
y el **Jefe de departamento lo remite al Consejo con el formato C** (`POST /anteproyecto/remision`), paso
obligatorio antes de la decisión. En el front es la pestaña "Presentaciones" de "Documentos cargados": el
jefe remite la versión aprobada y el Consejo evalúa la remisión vigente.

Concepto del evaluador (2026-10-12): el **formato B es obligatorio** y el evaluador puede adjuntar un
segundo archivo opcional con sus **anotaciones** (parte `anotaciones`).

Plan original:
- `?etapa=APROBACION_CONSEJO` y `POST /anteproyecto/decisiones-consejo` (resolución obligatoria).
- Al aprobar, el trabajo pasa a `EN_CURSO`: el front lo muestra como “trabajo de grado”.

### Fases 4 y 5 — Trabajo en curso y solicitudes al Consejo ✅ (2026-10-12)
Se integraron juntas (decisión §6.4). Hecho:
- **Trabajo de grado = vista del backend**: `ThesisWorkStorageService` ya no usa IndexedDB; es la vista
  `trabajosDeGrado` (un trabajo existe desde que el Consejo aprueba el anteproyecto). Se eliminaron
  `ThesisWorkApiService` (con `verifyDeliveryDeadlinesMock` y la reactivación simulada) y
  `ThesisWorkEvaluationService`.
- **Detalle**: muestra las fechas que calcula el backend (inicio, fecha máxima de entrega, sustentación
  desde, límite del cambio de objetivos y de la prórroga). El navegador ya no calcula vencimientos (§6.6).
- **Informes mensuales** (antes "avances", §6.1–6.2): pestaña "Informes mensuales". Los radica el
  estudiante en ambas modalidades (en práctica profesional también el director) con un PDF (formato D) y
  observaciones opcionales; los revisan el director, el codirector o el asesor —una vez cada uno— con
  observaciones y/o un PDF de notas (`POST /informes-mensuales/{numero}/revisiones`). La revisión es una
  formalidad: no cambia la etapa. Solo en `EN_CURSO` o `PRORROGA`.
- **Solicitudes** (§6.3–6.4): formulario según el tipo, con las opciones que permite la etapa:
  cambio de título y objetivos (título y objetivos editables + justificación, una vez, dentro de los
  6 meses), prórroga (1–3 meses + PDF), suspensión (PDF), **reanudación** (PDF; reemplaza a "reactivar",
  también desde la lista de trabajos) y cancelación (PDF). "Nueva fecha de sustentación" queda oculta
  hasta la Fase 6.
- **Decisión del Consejo** (§6.5): sin selector de fecha; aprueba o no aprueba con la **resolución en PDF
  obligatoria** y observaciones opcionales. Las fechas resultantes las calcula el backend.
- Un trabajo **suspendido se puede consultar** (antes se bloqueaba); sus acciones siguen bloqueadas salvo
  el registro de la reanudación.

### Fase 6 — Sustentación ✅ (2026-10-13)
Hecho según las decisiones del §7:
- **Backend:** solicitud con monografía (nueva, obligatoria), formato E, paz y salvo, concepto del asesor (PP) y
  anexos opcionales; programación multipart con **jurado coordinador**, segundo jurado y **formato E obligatorio**;
  los evaluadores del anteproyecto no pueden ser jurados del mismo trabajo; roles `JURADO` y `JURADO_COORDINADOR`
  (nuevo) al programar; **solo el coordinador** califica (acta G obligatoria), registra la inasistencia, verifica los
  ajustes y carga la versión definitiva; ajustes con anexos; **nueva fecha de sustentación** (`/sustentacion/nueva-fecha`
  y su decisión del Consejo con la nueva fecha y hora). 382 pruebas; Thunder 199 peticiones.
- **Front:** la entrega final es la solicitud de sustentación; la pestaña de paz y salvo solo consulta (se eliminó el
  registro de Decanatura); programar elige coordinador y segundo jurado; la calificación incluye la inasistencia; los
  ajustes llevan anexos opcionales y la verificación es "cumple / no cumple" sin archivo; "Correspondencia" ahora es
  "Versión definitiva"; "Nueva fecha de sustentación" es una solicitud especial (el Consejo fija la fecha al aprobar).
  Se quitó el modo de solo lectura de las pestañas de la fase 6.

### Fase 7 — Transversales ✅ (2026-10-14)
Hecho según las decisiones del §8:
- **Backend:** módulo de **notificaciones** (tabla `notificaciones`, `GET /notificaciones`, `PATCH /{id}/leida`,
  `PATCH /leidas`, `DELETE /{id}` y `DELETE`); cada operación del trabajo notifica a sus destinatarios (participantes
  y Comité, Jefe del departamento del director o Consejo según el hecho), nunca a quien la realiza. La tarea diaria
  notifica los cierres y cambios de etapa que aplica y crea los avisos de plazos por vencer (3 días para el concepto
  de la propuesta y la evaluación del anteproyecto; 30 días para el fin del plazo de ejecución), una sola vez por
  usuario y fecha límite. **Anulación** del director (`POST /trabajos-grado/{id}/anulacion` con justificación): solo en
  propuesta o anteproyecto; el trabajo queda `CANCELADO` con motivo `ANULACION_DIRECTOR`. **Decanatura** consulta
  todos los trabajos. 408 pruebas; Thunder 216 peticiones (carpeta 8).
- **Front:** el **historial** es una sola lista de trabajos archivados (etapa de cierre, resultado, motivo y fecha) con
  acceso a la propuesta, el anteproyecto y el trabajo según las etapas que alcanzó; lo ven los participantes
  (estudiantes, director, codirector y asesor) y Administrador, Comité, Consejo, Jefe de departamento y Decanatura,
  no los evaluadores ni los jurados. Las **estadísticas** cuentan cada trabajo una vez en su etapa más avanzada (los
  cerrados con su resultado final) y las ven además Comité, Jefe de departamento y Decanatura. La **bandeja de
  entrada** consulta el buzón del backend al iniciar sesión y cada minuto (avisa las nuevas y recarga los trabajos);
  se eliminaron el procesador de eventos local, los constructores de mensajes y el `deadline-monitor`. "Eliminar"
  propuesta/anteproyecto ahora es **"Anular"** con justificación obligatoria.

### Ajustes posteriores a la fase 7 ✅ (2026-10-14)
Según las decisiones del §9 (detalle del backend en `sgtg_backend/docs/ajustes-2026-10-14.md`):
- **Evaluadores (solo front):** la lista de anteproyectos solo les muestra los que aún deben evaluar; los evaluados
  pasan a su historial, donde consultan el anteproyecto.
- **Paz y salvo:** la solicitud de sustentación ya no lo lleva; Decanatura lo revisa desde la pestaña "Paz y salvo"
  (página "Revisar paz y salvo": aprobado o no, formato F obligatorio y observaciones si no lo aprueba). "Programar
  sustentación" espera el paz y salvo aprobado.
- **Estudiantes:** un trabajo activo a la vez (sin importar la modalidad) y quien ya aprobó no participa en otro; el
  formulario de la propuesta solo ofrece los estudiantes disponibles (`GET /trabajos-grado/estudiantes-disponibles`).
- **Propuesta:** la respuesta del Comité exige el documento de respuesta.
- Backend 419 pruebas; Thunder 235 peticiones; E2E por nginx.

### Fase 8 — Limpieza ✅ (2026-10-17)
Según las decisiones del §10:
- **Backend:** la falta de participación o de papel en el trabajo (`NoAccessException`) responde **403** (antes 406);
  un documento o correo repetido sigue respondiendo 406. Docker usa `ddl-auto=update`: la base de desarrollo conserva
  los datos entre reinicios (`docker compose down -v` para empezar de cero); las pruebas siguen con `create-drop`.
  419 pruebas; Thunder 235 peticiones.
- **Front:** se eliminaron el bus de eventos (`EventBusService`, `AppEventType` y sus `emit`), el almacén de
  IndexedDB y la dependencia `fake-indexeddb`, los roles "en memoria" de usuarios y los métodos sin efecto de los
  almacenes; los métodos con sufijo `Mock` que ya llamaban al backend se renombraron (`getThesisWorkById`,
  `getProposalById`, `createProposal`, `updateProposal`, `createUser`, `updateUser`, `softDeleteUser`...). El buzón
  refresca el usuario de la sesión (`/usuarios/me`) cuando llegan notificaciones nuevas, así los roles de contexto
  que asigna el backend (evaluador, jurado...) aparecen sin volver a iniciar sesión. 1912 pruebas.

### Ajustes del 2026-10-17 ✅
Los tres pendientes del §11, según las decisiones del §12 (detalle del backend en
`sgtg_backend/docs/ajustes-2026-10-17.md`):
- **Tipo de vinculación:** el formulario de usuarios muestra el desplegable "Tipo de vinculación" (de planta, ocasional,
  cátedra, estudiante de posgrado) y el departamento con cualquier rol de perfil docente (`ROLES_DOCENTE`); ambos son
  obligatorios y no tienen valor por defecto. Si no es de planta, avisa que al dirigir necesita un codirector de planta.
  Se eliminó la deducción de la vinculación a partir de los roles (`contractTypeForRoles`).
- **Nombre de los documentos:** el backend guarda cada archivo con el nombre de su tipo y su versión
  (`15/TI-A/v2/Formato A - v2.pdf`, `20/CARTA_ACEPTACION/v1/Carta de aceptacion - v1.pdf`); el front lo muestra según lo
  que es (`etiquetaDeRuta`: "Formato A (propuesta) – versión 2", "Carta de aceptación", "Resolución del Consejo"...) y lo
  descarga con el nombre del servidor.
- **Plazo de ejecución:** al aprobar el anteproyecto, el Consejo elige 6 o 9 meses (investigación) o 6, 9 o 12
  (práctica), con la fecha en que vence cada opción; el backend recibe `mesesEjecucion`, lo valida y calcula la fecha
  máxima de entrega desde el día de la decisión. La sustentación puede solicitarse desde los 3 meses en ambas
  modalidades. La prórroga suma su tiempo a la fecha elegida.
- Backend 421 pruebas; front 1916; Thunder 236 peticiones; E2E por nginx.

## 3. Inquietudes (decisiones antes o durante cada fase)

| | Inquietud | Recomendación |
|---|---|---|
| A | El front maneja propuesta, anteproyecto y trabajo como **tres entidades** con ids propios; el backend tiene **un solo trabajo** que cambia de etapa. | Usar el **id del trabajo** en las tres vistas (`/proposal/details/15`, `/preliminary-draft/details/15`, `/thesis-work/details/15`) y construir cada vista desde la misma respuesta. Fase 0. |
| B | **Roles de contexto**: el front da acceso a pantallas por roles (EVALUADOR, JURADO, DIRECTOR, CODIRECTOR) que hoy “gana” al participar (simulado). El backend no asigna roles: autoriza por participación. Un docente asignado como evaluador sin rol EVALUADOR no vería “Evaluar anteproyecto”. | Que el **backend agregue el rol** al asignar (director/codirector al crear, evaluador al asignar, jurado al programar) y el front refresque la sesión. Alternativa: guards del front por participación. Antes de la Fase 1. |
| C | **Avances**: el front los carga el estudiante y los evalúan director/codirector/asesor; el backend solo tiene **informes mensuales de PP** que radica el director, sin evaluación. | ✅ Resuelta (§5.5 y §6.1–6.2): informes mensuales en ambas modalidades con revisiones. |
| D | **Paz y salvo**: en el front lo registra DECANATURA con aprobación académica/financiera; en el backend es un archivo (formato F) que adjunta el director al solicitar la sustentación. DECANATURA no tiene permisos en el backend. | Ajustar el front al flujo del backend, o agregar el registro por Decanatura al backend. Fase 6. |
| E | Funciones del front **sin equivalente** en el backend: eliminar propuesta, editar propuesta en cualquier momento, solicitud especial “nueva fecha de sustentación”, evaluación “Aprobado con observaciones” en la propuesta. | ✅ Resuelta: la nueva fecha de sustentación en la fase 6 (§7) y eliminar = **anular** (borrado lógico) en la fase 7 (§8). |
| F | Un **Jefe de departamento** sin rol DIRECTOR/CODIRECTOR no tiene perfil docente (decisión de usuarios) y el backend exige su departamento para asignar evaluadores. | Darle perfil docente (departamento) al Jefe en el formulario de usuarios. Antes de la Fase 2. |
| G | **Notificaciones**: el front las genera localmente con un bus de eventos simulado; el backend no tiene notificaciones. | ✅ Resuelta (§8.3): módulo de notificaciones en el backend; el front consulta el buzón. |
| H | **Estadísticas** necesitan todos los trabajos; el backend solo lista por participante o por etapa. | ✅ Resuelta (§8.2): `GET /trabajos-grado` sin etapa, también para Decanatura; un registro por trabajo. |
| I | **Datos de la propuesta**: el backend exige `objetivos` y no guarda `description` ni `lineOfResearch`. | Agregar objetivos al formulario; decidir si el backend guarda descripción y línea de investigación. Fase 1. |
| J | **Descarga**: los archivos ya no son base64; el front debe pedirlos con el token. | Resolver en la Fase 0 con `FileDownloadService`. |
| K | **Vencimientos**: el front los calcula en el navegador (`verifyDeliveryDeadlinesMock`); el backend tiene la tarea programada diaria. | ✅ Resuelta (§6.6): se quitó el cálculo local; el front muestra las fechas del backend. El `deadline-monitor` se eliminó en la fase 7: los avisos los crea la tarea diaria del backend (§8.4). |

## 4. Decisiones tomadas (2026-10-09)

1. **A — Mismo id, tres vistas**: propuesta, anteproyecto y trabajo de grado usan el id del trabajo del backend y se construyen desde la misma respuesta.
2. **B — El backend asigna los roles de contexto**: DIRECTOR (y CODIRECTOR al codirector) al crear el trabajo, EVALUADOR al asignar evaluadores, JURADO al programar la sustentación. El front refresca la sesión (`/usuarios/me`) después de esas operaciones. Se implementa en la fase en que ocurre cada asignación (1, 2 y 6).
3. **I — Propuesta**: el formulario agrega **objetivos**; el backend guarda además **descripción** y **línea de investigación** (opcionales). Fase 1.
4. **F — Jefe de departamento**: con rol JEFE_DEP el formulario de usuarios pide departamento y lo registra como **PLANTA** (se amplía la regla: CODIRECTOR o JEFE_DEP → PLANTA; solo DIRECTOR → OCASIONAL). Antes de la Fase 2.

## 5. Decisiones del 2026-10-12

1. **Formato C**: obligatorio; lo carga el Jefe de departamento al remitir al Consejo el anteproyecto aprobado por los evaluadores (Fase 3, hecho).
2. **Concepto del evaluador**: formato B obligatorio y un segundo archivo opcional con las anotaciones (Fase 2, hecho).
3. **Título y descripción del anteproyecto**: solo lectura; cambian únicamente por el proceso de cambio de objetivos del reglamento, en sus plazos (Fase 4).
4. **Eliminar o anular propuestas y anteproyectos** (inquietud E): definido en la fase 7 (§8.5).
5. **Avances** (inquietud C): se mapean a los **informes mensuales** de la práctica profesional (opción A); se implementa en la Fase 4.

## 6. Decisiones del 2026-10-12 (fases 4 y 5)

1. **Revisión de informes (opción C)**: el director, el codirector o el asesor registran observaciones y/o un PDF de notas; es una formalidad que **no cambia el estado ni el flujo** del trabajo.
2. **Informes en investigación**: también aplican; los carga el estudiante y los revisan el director o el codirector con sus notas u observaciones (PDF). En práctica profesional el director también puede radicarlos.
3. **Cambio de título y objetivos**: el formulario muestra el título y los objetivos editables; los comentarios son la justificación; solo una vez y dentro de los 6 meses; el Consejo exige la resolución en PDF.
4. **Fases 4 y 5 juntas**: formulario de solicitudes según el tipo; "reactivar" = reanudación; "nueva fecha de sustentación" oculta hasta la Fase 6.
5. **Decisión del Consejo**: sin selector de fecha; aprueba o no aprueba con resolución PDF obligatoria y observaciones opcionales.
6. **Vencimientos**: se quita `verifyDeliveryDeadlinesMock`; el detalle muestra las fechas del backend.
7. **Pestañas de la fase 6**: muestran los datos del backend con las acciones deshabilitadas y un aviso.

Pendientes de decidir en su fase: D (paz y salvo), E (funciones sin equivalente, incluida la anulación), G (notificaciones), H (estadísticas).

## 7. Decisiones del 2026-10-12 (fase 6, pendiente de implementar)

1. **Entrega final = solicitar sustentación** (inquietud D, opción A): el director adjunta el formato E, el paz y salvo (formato F), el concepto del asesor en práctica profesional y anexos opcionales (PDF). La pestaña "Paz y salvo" solo consulta el formato F; Decanatura no participa.
2. **Programación (Consejo)**: jurados, fecha y hora, salón y el **formato E**, que el backend exigirá como obligatorio. Los evaluadores del anteproyecto **no** pueden ser jurados del mismo trabajo (sí de otros). El backend asigna el rol JURADO al programar y se crea el rol **JURADO_COORDINADOR**.
3. **Calificación**: la registra solo el **jurado coordinador**, con el acta (formato G) **obligatoria**; el otro jurado solo consulta los archivos del trabajo.
4. **Inasistencia** (jurado) y **segunda sesión** programada por el Consejo desde la pestaña de sustentación cuando el trabajo está aplazado. Se conserva la solicitud especial **"Nueva fecha de sustentación"**, que se puede hacer antes de la fecha designada (requiere backend).
5. **Ajustes**: el backend acepta también **anexos en PDF**; las reglas se mantienen.
6. La pestaña "Correspondencia" se renombra **"Versión definitiva"**.
7. El jurado ve el trabajo con las pestañas de sustentación, ajustes y versión definitiva; las demás solo las consulta.

Confirmado después (2026-10-12):
- La monografía y el formato E son **dos PDF** separados.
- El **Consejo marca, al programar, cuál de los dos jurados es el coordinador**. El coordinador califica, registra la inasistencia, verifica los ajustes y carga la versión definitiva.
- La **nueva fecha de sustentación la solicita el director y la aprueba el Consejo**; al aprobarse, la sesión se reprograma.

## 8. Decisiones del 2026-10-14 (fase 7)

1. **Historial**: archiva los trabajos de grado que se terminan, se cancelan o se abandonan, **uno por trabajo** en una
   sola lista; al abrirlo se consultan sus documentos y **versiones anteriores**. Evaluadores y jurados **no** lo ven;
   Decanatura sí (como Administrador, Comité, Consejo y Jefe de departamento).
2. **Estadísticas**: cada trabajo se cuenta una vez, por su etapa actual y con los datos del backend. Las ven
   Administrador, Consejo, Comité, Jefe de departamento y Decanatura.
3. **Notificaciones**: módulo en el backend (opción A); el buzón del front las consulta. Solo buzón, sin correo.
4. **Vencimientos**: la tarea diaria del backend crea los avisos "por vencer" (3 días para la propuesta y el
   anteproyecto, 30 días para el trabajo) y se elimina el `deadline-monitor` del front.
5. **Anular**: borrado lógico que archiva el trabajo. Lo hace el **director** directamente, con justificación
   obligatoria, en propuesta o anteproyecto (antes de la aprobación del Consejo); después se solicita la cancelación
   al Consejo. "Abandonado" no es un estado nuevo: es el cierre por vencimiento de plazos o la anulación.

## 9. Decisiones del 2026-10-14 (ajustes posteriores a la fase 7)

1. **Evaluadores:** en la lista solo ven los anteproyectos que no han evaluado; los evaluados pasan a su historial (solo
   desaparecen de la lista; el detalle sigue disponible).
2. **Paz y salvo:** al solicitar la sustentación no se adjunta; la solicitud le llega a Decanatura, que carga el formato F
   aprobándolo o no (el documento es obligatorio en ambos casos). No hay plazo reglamentario.
3. **Estudiantes:** un solo trabajo activo sin importar la modalidad; quien terminó satisfactoriamente no puede ser
   elegido para otro. Los datos existentes no importan (la base se recrea).
4. **Propuesta:** cuando el director radica el formato A, la respuesta del Comité incluye un documento de respuesta
   obligatorio.

## 10. Decisiones del 2026-10-17 (fase 8)

1. **403 en vez de 406** para la falta de acceso a un trabajo (participación o papel).
2. **Base de desarrollo persistente**: `ddl-auto=update` en Docker; las pruebas usan `create-drop`.
3. **Refresco de roles**: el front refresca `/usuarios/me` cuando el buzón recibe notificaciones nuevas.

## 11. Pendientes

Los tres pendientes registrados el 2026-10-17 quedaron implementados el mismo día (ver "Ajustes del 2026-10-17" y el
§12):

1. ~~**Tipo de vinculación en el formulario de usuarios.**~~ ✅
2. ~~**Nombre de los documentos según lo que son.**~~ ✅
3. ~~**Plazo de ejecución elegido por el Consejo.**~~ ✅

## 12. Decisiones del 2026-10-17 (pendientes del §11)

1. **Vinculación:** se muestran el desplegable de vinculación y el departamento, ambos obligatorios, con cualquier rol
   de `ROLES_DOCENTE` (DOCENTE, DIRECTOR, CODIRECTOR, EVALUADOR, JURADO, JURADO_COORDINADOR, JEFE_DEP), sin valor por
   defecto. La deducción de la vinculación por roles era un ajuste temporal y se eliminó.
2. **Documentos:** en el servidor los archivos se guardan con un nombre descriptivo (`Formato A - v2.pdf`) y en el front
   se muestran como "Formato A (propuesta) – versión 2".
3. **Plazo de ejecución:**
   - opciones de 6 o 9 meses en trabajo de investigación y de 6, 9 o 12 en práctica profesional, contadas desde el día
     en que se registra la decisión del Consejo;
   - la sustentación se puede solicitar a partir de los 3 meses en ambas modalidades (antes 6 en práctica);
   - los datos existentes se conservan;
   - la prórroga no cambia: su tiempo se suma a la fecha máxima de entrega elegida.
