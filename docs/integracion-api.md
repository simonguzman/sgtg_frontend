# Integración Front ↔ API (sgtg_backend)

Inventario de los archivos del frontend que hoy simulan el backend (mocks con `of(...).pipe(delay())`
sobre IndexedDB / localStorage) y que deben pasar a consumir el API REST `/api/v1/sgtg/...`.

Columna **Endpoint**: se completa cuando se defina la correspondencia con el backend.

## 0. Infraestructura transversal (no existe aún)

| Necesidad | Estado actual | Archivo a crear / tocar |
|---|---|---|
| `apiUrl` | `environment.apiUrl = http://localhost:8080/api` (backend expone `/api/v1/sgtg`) | `src/environments/environment*.ts` |
| Interceptor JWT (`Authorization: Bearer`) y manejo 401/403 | No existe; `provideHttpClient()` sin interceptores | `src/app/app.config.ts` + `core/interceptors/` (nuevo) |
| Mapeo de errores `Error` del backend (`GC-xxxx`) a notificaciones | No existe | `core/interceptors/` o helper |
| Subida de archivos | Se convierten a base64 (`core/utils/file-reader.utils.ts`) y se guardan en IndexedDB | **Definido en el backend:** los endpoints con documentos reciben `multipart/form-data` (PDF en la parte `archivo`, JSON en la parte `datos`; sustentación: `documentoFinal`, `pazYSalvo`, `conceptoAsesor`). Solo PDF, máx. 20 MB. Reemplazar `readFileAsDataUrl` por `FormData` |
| Descarga de archivos | `FileDocument.url` es el base64 | `GET /api/v1/sgtg/trabajos-grado/{trabajoId}/archivos?ruta=<ruta>` con el token (blob). Solo participantes y COMITE/JEFE_DEP/CONSEJO/ADMINISTRADOR; los demás reciben 403 "No tiene acceso a la información…" |

## 1. Capa de acceso a datos (reemplazar por HttpClient)

Estos son los puntos de entrada reales; el resto del front los consume a través de ellos.

### Auth — `core/services/auth/`
| Archivo | Método | Qué hace hoy | Endpoint |
|---|---|---|---|
| `auth-api.service.ts` | `login(credentials)` | Busca usuario/contraseña en la lista local | |
| `auth-api.service.ts` | `changePassword(current, new)` | Compara contraseña en sesión y actualiza local | |
| `auth-api.service.ts` | `logout()` | Limpia sesión local | |
| `auth-storage.service.ts` | `setUser/updateUser/clearUser` | Guarda el `User` completo (con password) en `localStorage['sgtg_session']`. Debe pasar a guardar token + usuario de `/usuarios/me` | |

### Usuarios — `modules/users/services/` ✅ integrado (2026-10-09)
| Archivo | Método | Endpoint |
|---|---|---|
| `user-api.service.ts` | `loadUsers()` (al iniciar sesión, desde `UserService`) | `GET /usuarios` (no administradores: sin documento) |
| `user-api.service.ts` | `getUserById(id)` | `GET /usuarios/{id}` (404 → `undefined`) |
| `user-api.service.ts` | `getUsersByRole(role)` | filtra la lista cargada |
| `user-api.service.ts` | `createUser(user)` | `POST /usuarios` (con perfil) |
| `user-api.service.ts` | `updateUser(id, changes)` | `PUT /usuarios/{id}` (contraseña vacía = conservar) |
| `user-api.service.ts` | `softDeleteUser(id)` (alterna Activo/Inactivo) | `PUT /usuarios/{id}/estado` `{ activo }` |
| `user-api.service.ts` | `updateUserRoles(userId, roles)` | `PUT /usuarios/{id}/roles` `{ roles: [claves] }` |
| `user-api.service.ts` | `addRoleToUser / removeRoleFromUser / removeRolesFromUsers` | solo en memoria hasta integrar propuestas/anteproyectos/trabajos |
| `core/services/catalog/catalog-api.service.ts` | departamentos y programas (selects del formulario) | `GET/POST /catalogos/departamentos`, `/catalogos/programas` |

Perfil académico al crear o editar (`core/mappers/usuario.mapper.ts`, `mapUserToUsuarioRequest`):
- Rol CODIRECTOR (solo o con DIRECTOR) → `tipoVinculacion: PLANTA` + departamento (no requiere codirector).
- Rol DIRECTOR sin CODIRECTOR → `tipoVinculacion: OCASIONAL` + departamento (requiere codirector de planta del mismo departamento).
- Otros docentes (DOCENTE, JEFE_DEP, EVALUADOR, JURADO…) → sin perfil docente.
- Rol ESTUDIANTE → `programaId`.
El formulario muestra los selects de departamento/programa solo cuando los roles los requieren y permite agregar elementos al catálogo.

### Propuestas — `modules/proposal/services/`
| Archivo | Método | Endpoint |
|---|---|---|
| `proposal-api.service.ts` | `getProposalByIdMock(id)` | |
| `proposal-api.service.ts` | `createProposalMock(proposal)` | |
| `proposal-api.service.ts` | `updateProposalMock(id, changes)` | |
| `proposal-api.service.ts` | `deleteProposalMock(id)` | |
| `proposal-document.service.ts` | `addEvaluationMock(proposalId, evaluation)` (concepto del Comité) | |
| `proposal-document.service.ts` | `uploadCorrectionMock(proposalId, document)` (nueva versión) | |
| `proposal-storage.service.ts` | `proposals` / `allProposals` (listado filtrado por rol, IndexedDB `proposals`) | |
| `proposal-rules.service.ts` | `validateProposalRules`, `handleRoleExchange` (reglas que el backend ya valida) | |

### Anteproyectos — `modules/preliminary-draft/services/`
| Archivo | Método | Endpoint |
|---|---|---|
| `preliminary-draft-api.service.ts` | `getPreliminaryDraftById(id)` | |
| `preliminary-draft-api.service.ts` | `createPreliminaryDraft(draft)` | |
| `preliminary-draft-api.service.ts` | `updatePreliminaryDraft(id, data)` | |
| `preliminary-draft-api.service.ts` | `deleteDraft(id)` | |
| `preliminary-draft-assignment.service.ts` | `assignReviewersMock(...)` (Jefe de departamento asigna evaluadores) | |
| `preliminary-draft-document.service.ts` | `addEvaluationMock(...)` (concepto de evaluador) | |
| `preliminary-draft-document.service.ts` | `uploadDocumentMock(...)` (nueva versión / correcciones) | |
| `preliminary-draft-document.service.ts` | `uploadCouncilResolutionMock(...)` (resolución del Consejo) | |
| `preliminary-draft-storage.service.ts` | `preliminaryDrafts` / `allPreliminaryDrafts` (IndexedDB `preliminaryDrafts`) | |

### Trabajo de grado — `modules/thesis-work/services/`
| Archivo | Método | Endpoint |
|---|---|---|
| `thesis-work-api.service.ts` | `getThesisWorkByIdMock(id)` | |
| `thesis-work-api.service.ts` | `verifyDeliveryDeadlinesMock()` (cierre por vencimiento; en backend lo hace `VencimientosScheduler`) | |
| `thesis-work-api.service.ts` | `reactivateThesisWorkMock(id)` | |
| `thesis-work-advance.service.ts` | `uploadDocumentMock(...)` (avances / informes) | |
| `thesis-work-evaluation.service.ts` | `addEvaluationMock(id, evaluation)` (evaluar avance) | |
| `thesis-work-delivery.service.ts` | `uploadFinalDeliveryMock(...)` (monografía + Formato E + anexos) | |
| `thesis-work-delivery.service.ts` | `registerPazYSalvoMock(...)` | |
| `thesis-work-delivery.service.ts` | `uploadCorrectedDocumentsMock(...)` (ajustes post-sustentación) | |
| `thesis-work-delivery.service.ts` | `registerCorrespondenceDocumentMock(...)` | |
| `thesis-work-sustentation.service.ts` | `saveSustentationRegistryMock(...)` (programar sustentación: jurados, fecha, lugar) | |
| `thesis-work-sustentation.service.ts` | `registerSustentationVerdictMock(...)` (calificación de jurado) | |
| `thesis-work-sustentation.service.ts` | `evaluateCorrectedDocumentsMock(...)` (verificación de ajustes) | |
| `thesis-work-special-request.service.ts` | `createSpecialRequestMock(payload)` (prórroga, suspensión, cancelación, nueva sustentación, cambio de título/objetivos) | |
| `thesis-work-special-request.service.ts` | `evaluateSpecialRequestMock(...)` (decisión del Consejo) | |
| `thesis-work-storage.service.ts` | `allThesisWorks` / listado filtrado (IndexedDB `thesisWorks`), `triggerCascadeArchive` | |
| `thesis-work.service.ts` | Fachada que reexporta todo lo anterior; llama `verifyDeliveryDeadlinesMock()` en el constructor | |

## 2. Consumidores que leen los storages directamente (ajustar tras el cambio)

No llaman al API, pero dependen de las listas en memoria que hoy hidratan IndexedDB/localStorage:

- Guards: `core/guards/{proposal,preliminary-draft,thesis-work}-ownership.guard.ts`, `thesis-status.guard.ts`, `core/helpers/resolve-entity-for-guard.helper.ts`
- Historial: `modules/history/pages/history-page/services/archived-*-tab.service.ts`
- Estadísticas: `modules/statistics/services/statistics-state.service.ts`, `project-data-mapper.service.ts`
- Evaluaciones realizadas: `shared/pages/evaluations-performed-page/services/evaluations-facade.service.ts`
- Notificaciones: `modules/notifications/services/{deadline-monitor,inbox-event-processor,inbox-state}.service.ts` (bandeja en `localStorage['academic_inbox_messages']`, generada por `EventBusService`; **el backend no tiene notificaciones**)
- Formatos descargables: `shared/pages/downloadable-formats-page/` + `core/services/filedownload/file-download.service.ts` (único uso actual de `HttpClient`)
- Formatters: `modules/users/services/user-formatter.service.ts`, `modules/thesis-work/services/thesis-participants-formatter.service.ts`
- Mocks a retirar: `modules/users/mocks/users.mock.ts`, `modules/preliminary-draft/mocks/preliminary-drafts.mock.ts`, datos iniciales de `proposal-storage.service.ts`

## 3. Diferencias de modelo front ↔ back (impactan los DTO)

| Tema | Front | Back |
|---|---|---|
| Agregado | 3 entidades separadas: `Proposal` → `PreliminaryDraft` → `ThesisWork` (cada una con su id y copia anidada de la anterior) | Un solo agregado `TrabajoGrado` (`Long id`) con `propuesta`, `anteproyecto`, `ejecucion`, `sustentacion`, `cancelaciones`, `historial` |
| Ids | `string` (UUID) | `Long` |
| Usuario | `firstName, secondName, lastName, secondLastName, idType, idNumber:number, codeNumber:number, state, password` | `primerNombre, segundoNombre, primerApellido, segundoApellido, tipoDocumento (CC/CE/PASAPORTE), numeroDocumento:string, codigo:string`; sin `estado` ni actualización/desactivación |
| Roles | Etiquetas (`'Jefe de departamento'`, `'Comité del programa'`…) | Claves (`JEFE_DEP`, `COMITE`…) |
| Estados | `stateList` único (Aprobado, En revisión, En desarrollo…) | `Proceso` (etapa), `Estado` (propuesta/anteproyecto), `ResultadoConcepto`, `Calificacion`, `EstadoSustentacion`, `MotivoCierre` |
| Modalidad | `'Trabajo de investigación' / 'Practica profesional'` | `TRABAJO_DE_INVESTIGACION / PRACTICA_PROFESIONAL` |
| Documentos | `FileDocument { id, name, url (base64), uploadDate, type, status }` | `DocumentoDTO { tipo, formato, ruta, version, fechaCarga }` y campos `ruta*`; la ruta es `<trabajoId>/<carpeta>/v<n>/<nombre>` (carpeta = formato `TI-A`, `PP-B`… o tipo `ANTEPROYECTO`, `RESOLUCION`…) |
| Contenido propuesta | `title, description, lineOfResearch` | `titulo, objetivos: string[]` |
| Evaluaciones | `Evaluation` genérica con `veredict`, `observations`, `signedDocuments` | `DecisionDTO` (Comité/Consejo) y `ConceptoEvaluacionDTO` (evaluadores), `CalificacionJuradoDTO` (jurados) |
| Solicitudes especiales | `SpecialRequest` genérica con `requestType` | Endpoints específicos: `prorroga`, `suspension`, `cancelacion`, `cambio-objetivos` (+ `/decisiones-consejo`) |
| Avances | `Advance` con varios archivos y evaluación | `informes-mensuales` (solo `rutaDocumento`, sin evaluación) |
| Paz y salvo | Registro con aprobado académico/financiero + comentarios | Solo `rutaPazYSalvo` dentro de `SolicitudSustentacionDTORequest` |
