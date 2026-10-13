import {
  CalificacionApi, DecisionApi, DocumentoApi, EstadoApi, EstadoSustentacionApi, InformeMensualApi, VersionDocumentoApi,
  ETAPAS_FINALES, ProcesoApi, ResultadoConceptoApi, TrabajoGradoResponse
} from '../interfaces/api/trabajo-grado-api.interface';
import { stateList } from '../enums/state.enum';
import { DocumentType } from '../enums/document-type.enum';
import { UserRoleType } from '../enums/user-role-type.enum';
import { Evaluation } from '../interfaces/evaluation.interface';
import { FileDocument } from '../interfaces/file-document.interface';
import { FormattedDocument } from '../interfaces/formatted-document.interface';
import { User } from '../../modules/users/interfaces/user.interface';
import { UserState } from '../../modules/users/enum/user-state.enum';
import { Modality } from '../../modules/proposal/enums/modality.enum';
import { Proposal } from '../../modules/proposal/interfaces/proposal.interface';
import { PreliminaryDraft } from '../../modules/preliminary-draft/interfaces/preliminary-draft.interface';
import { ThesisWork } from '../../modules/thesis-work/interfaces/thesis-work.interface';
import { Advance } from '../../modules/thesis-work/interfaces/advance.interface';
import { SpecialRequest } from '../../modules/thesis-work/interfaces/special-request.interface';
import { SpecialRequestType } from '../../modules/thesis-work/enums/special-request-type.enum';
import { SustentationRegistry } from '../../modules/thesis-work/interfaces/sustentation-registry.interface';
import { JurorVerdict } from '../../modules/thesis-work/interfaces/juror-verdict.interface';
import { SustentationStatus } from '../../modules/thesis-work/enums/sustentation-status.enum';
import { FinalDelivery } from '../../modules/thesis-work/interfaces/final-delivery.interface';
import { PazYSalvoRegistry } from '../../modules/thesis-work/interfaces/paz-y-salvo-registry.interface';
import { CorrectedDelivery } from '../../modules/thesis-work/interfaces/corrected-delivery.interface';

/**
 * Construye las vistas del front (propuesta, anteproyecto y trabajo de grado)
 * desde un único trabajo del backend. Las tres usan el **id del trabajo**.
 *
 * - Propuesta: siempre existe.
 * - Anteproyecto: existe cuando el Comité aprobó la propuesta.
 * - Trabajo de grado: existe cuando el Consejo aprobó el anteproyecto (hay ejecución).
 * - Todas quedan archivadas (`isArchived`) cuando el trabajo se cierra.
 */

/** Datos externos que necesita el mapeo. */
export interface ContextoMapeo {
  /** Usuarios conocidos por id (para usar sus datos completos); si falta, se arma con los datos del trabajo */
  usuarios: ReadonlyMap<string, User>;
  /** URL de descarga de un archivo del trabajo */
  urlArchivo: (trabajoId: number, ruta: string) => string;
}

// ── Vistas ──────────────────────────────────────────────────────────────────

export function aPropuesta(trabajo: TrabajoGradoResponse, ctx: ContextoMapeo): Proposal {
  const id = String(trabajo.id);
  const versiones = trabajo.propuesta.versiones;
  const documentos: FileDocument[] = versiones.map(version => ({
    ...aDocumento(trabajo.id, version, ctx, DocumentType.PROPUESTA),
    status: estadoDeEntrega(version.estado)
  }));
  if (trabajo.cartaAceptacion) {
    documentos.push(aDocumento(trabajo.id, trabajo.cartaAceptacion, ctx, DocumentType.FORMATO));
  }
  return {
    id,
    title: trabajo.titulo,
    description: trabajo.descripcion ?? trabajo.objetivos[0] ?? '',
    objectives: [...trabajo.objetivos],
    lineOfResearch: trabajo.lineaInvestigacion ?? undefined,
    organization: trabajo.asesor?.organizacion ?? undefined,
    modality: trabajo.modalidad === 'PRACTICA_PROFESIONAL' ? Modality.PP : Modality.TI,
    authors: trabajo.estudiantes.map(e => aUsuario(e.usuarioId, e.nombreCompleto, e.email, e.codigo, ctx)),
    director: aUsuario(trabajo.director.usuarioId, trabajo.director.nombreCompleto, trabajo.director.email,
      trabajo.director.codigo, ctx),
    codirector: trabajo.codirector ? aUsuario(trabajo.codirector.usuarioId, trabajo.codirector.nombreCompleto,
      trabajo.codirector.email, trabajo.codirector.codigo, ctx) : undefined,
    advisor: trabajo.asesor ? aUsuario(trabajo.asesor.usuarioId, trabajo.asesor.nombreCompleto,
      trabajo.asesor.email, trabajo.asesor.codigo, ctx) : undefined,
    state: estadoPropuesta(trabajo),
    createdAt: aFecha(versiones[0]?.fechaCarga ?? trabajo.historial[0]?.fecha) ?? new Date(),
    evaluationDeadline: aFecha(trabajo.propuesta.fechaLimiteConcepto) ?? undefined,
    documents: documentos,
    evaluations: trabajo.propuesta.decisiones.map((decision, i) =>
      evaluacionDeDecision(trabajo, decision, i, ctx)),
    isArchived: estaCerrado(trabajo),
    isActive: true
  };
}

/**
 * @returns el anteproyecto, o null si la propuesta aún no está aprobada o el
 * director todavía no radica su primera versión (aún no está registrado)
 */
export function aAnteproyecto(trabajo: TrabajoGradoResponse, ctx: ContextoMapeo): PreliminaryDraft | null {
  if (estadoActualPropuesta(trabajo) !== 'APROBADO' || trabajo.anteproyecto.versiones.length === 0) return null;
  const id = String(trabajo.id);
  const anteproyecto = trabajo.anteproyecto;
  const documentos = [
    ...anteproyecto.versiones.map(v => ({
      ...aDocumento(trabajo.id, v, ctx, DocumentType.ANTEPROYECTO),
      status: estadoDeEntrega(v.estado)
    })),
    // Formato C de cada remisión al Consejo, con el estado de su decisión
    ...anteproyecto.remisiones.map(remision => ({
      ...aDocumento(trabajo.id, remision, ctx, DocumentType.FORMATO_C),
      status: estadoRemision(trabajo, remision.version)
    })),
    ...anteproyecto.decisionesConsejo
      .filter(decision => decision.rutaArchivo)
      .map(decision => aDocumentoDeRuta(trabajo.id, decision.rutaArchivo!, decision.fecha, ctx, DocumentType.RESOLUCION))
  ];
  return {
    preliminaryDraftId: id,
    proposalId: id,
    proposalData: aPropuesta(trabajo, ctx),
    evaluators: anteproyecto.evaluadores.map(e => aUsuario(e.usuarioId, e.nombreCompleto, e.email, e.codigo, ctx)),
    evaluations: [
      ...anteproyecto.conceptos.map((concepto, i): Evaluation => ({
        id: `${id}-concepto-${i}`,
        proposalId: id,
        documentId: anteproyecto.versiones.find(v => v.version === concepto.version)?.ruta,
        evaluatorId: String(concepto.evaluadorUsuarioId),
        evaluatorName: concepto.evaluador,
        evaluatorRole: UserRoleType.EVALUADOR,
        veredict: veredicto(concepto.resultado),
        observations: concepto.observaciones ?? '',
        signedDocuments: [concepto.formato, concepto.anotaciones]
          .filter((documento): documento is DocumentoApi => !!documento)
          .map(documento => aDocumentoFirmado(trabajo.id, documento.ruta, ctx)),
        date: aFecha(concepto.fecha) ?? new Date()
      })),
      ...anteproyecto.decisionesConsejo.map((decision, i) => evaluacionDeDecision(trabajo, decision, i, ctx))
    ],
    documents: documentos,
    state: estadoAnteproyecto(trabajo),
    createdData: aFecha(anteproyecto.versiones[0]?.fechaCarga ?? fechaDeEntrada(trabajo, 'ANTEPROYECTO')) ?? new Date(),
    evaluationDeadline: aFecha(anteproyecto.fechaLimiteEvaluacion) ?? undefined,
    maximumDeliveryDate: aFecha(trabajo.ejecucion?.fechaFin) ?? undefined,
    isArchived: estaCerrado(trabajo)
  };
}

/**
 * @returns el trabajo de grado, o null si el Consejo aún no aprueba el anteproyecto.
 * Los informes mensuales son sus avances (el más reciente primero) y sus
 * revisiones, las evaluaciones; las solicitudes del director (cambio de
 * objetivos, prórroga, suspensión, reanudación, cancelación) son sus
 * solicitudes especiales. La sustentación (fase 6) se muestra en solo lectura.
 */
export function aTrabajoDeGrado(trabajo: TrabajoGradoResponse, ctx: ContextoMapeo): ThesisWork | null {
  const anteproyecto = aAnteproyecto(trabajo, ctx);
  const ejecucion = trabajo.ejecucion;
  if (!ejecucion || !anteproyecto) return null;
  const id = String(trabajo.id);
  const informes = ejecucion.informesMensuales;
  return {
    thesisWorkId: id,
    preliminaryDraftId: id,
    preliminaryDraftData: anteproyecto,
    documents: documentosDeCierre(trabajo, ctx),
    advances: informes.map(informe => aInforme(trabajo, informe, ctx)).reverse(),
    finalDeliveries: entregasFinales(trabajo, ctx),
    pazYSalvos: pazYSalvos(trabajo, ctx),
    correctedDeliveries: entregasCorregidas(trabajo, ctx),
    evaluations: informes.flatMap(informe => revisionesDeInforme(trabajo, informe, ctx)),
    sustentations: sesionesDeSustentacion(trabajo, ctx),
    specialRequests: solicitudesEspeciales(trabajo, ctx),
    state: estadoTrabajo(trabajo.etapa),
    createdDate: aFecha(ejecucion.fechaNotificacion) ?? new Date(),
    stage: trabajo.etapa,
    deadlines: {
      startDate: aFecha(ejecucion.fechaNotificacion),
      maximumDeliveryDate: aFecha(ejecucion.fechaFin),
      minimumSustentationDate: aFecha(ejecucion.fechaMinimaSustentacion),
      objectivesChangeDeadline: aFecha(ejecucion.fechaLimiteCambioObjetivos),
      extensionRequestDeadline: aFecha(ejecucion.fechaLimiteSolicitudProrroga)
    },
    isArchived: estaCerrado(trabajo)
  };
}

// ── Trabajo en curso ────────────────────────────────────────────────────────

/** Informe mensual como avance: "En revisión" hasta que alguien lo revisa. */
function aInforme(trabajo: TrabajoGradoResponse, informe: InformeMensualApi, ctx: ContextoMapeo): Advance {
  const radicador = [...trabajo.estudiantes, trabajo.director].find(p => p.codigo === informe.radicadoPor);
  return {
    id: String(informe.numero),
    title: `Informe mensual ${informe.numero}`,
    comments: informe.observaciones ?? '',
    uploadDate: aFecha(informe.fecha) ?? informe.fecha,
    studentId: radicador ? String(radicador.usuarioId) : '',
    uploadedBy: radicador?.nombreCompleto,
    status: informe.revisiones.length > 0 ? stateList.EVALUADO : stateList.EN_REVISION,
    documents: [aDocumentoDeRuta(trabajo.id, informe.rutaArchivo, informe.fecha, ctx, DocumentType.AVANCE)]
  };
}

/** Revisiones de un informe como evaluaciones (`advanceId` = número del informe). */
function revisionesDeInforme(trabajo: TrabajoGradoResponse, informe: InformeMensualApi,
  ctx: ContextoMapeo): Evaluation[] {
  return informe.revisiones.map((revision, i) => ({
    id: `${trabajo.id}-informe-${informe.numero}-revision-${i}`,
    proposalId: String(trabajo.id),
    advanceId: String(informe.numero),
    evaluatorId: String(revision.revisorUsuarioId),
    evaluatorName: revision.revisor,
    evaluatorRole: rolDelRevisor(trabajo, revision.revisorUsuarioId),
    veredict: stateList.EVALUADO,
    observations: revision.observaciones ?? '',
    signedDocuments: revision.rutaArchivo ? [aDocumentoFirmado(trabajo.id, revision.rutaArchivo, ctx)] : [],
    date: aFecha(revision.fecha) ?? new Date()
  }));
}

function rolDelRevisor(trabajo: TrabajoGradoResponse, usuarioId: number): UserRoleType {
  if (trabajo.codirector?.usuarioId === usuarioId) return UserRoleType.CODIRECTOR;
  if (trabajo.asesor?.usuarioId === usuarioId) return UserRoleType.ASESOR;
  return UserRoleType.DIRECTOR;
}

/** Estado de una solicitud según la decisión del Consejo (sin decisión: en revisión). */
function estadoSolicitud(decision: DecisionApi | null): SpecialRequest['status'] {
  if (!decision) return stateList.EN_REVISION;
  return decision.resultado === 'APROBADO' ? stateList.APROBADO : stateList.NO_APROBADO;
}

/** Datos de la decisión del Consejo sobre una solicitud. */
function decisionDeSolicitud(trabajo: TrabajoGradoResponse, decision: DecisionApi | null,
  ctx: ContextoMapeo): Partial<SpecialRequest> {
  if (!decision) return {};
  return {
    resolutionDetails: decision.observaciones ?? undefined,
    resolutionDate: aFecha(decision.fecha) ?? undefined,
    resolution: decision.rutaArchivo
      ? aDocumentoDeRuta(trabajo.id, decision.rutaArchivo, decision.fecha, ctx, DocumentType.RESOLUCION)
      : undefined
  };
}

/**
 * Solicitudes del director, de la más reciente a la más antigua. El id indica
 * el tipo y su posición en el backend (ej. `suspension-0`).
 */
export function solicitudesEspeciales(trabajo: TrabajoGradoResponse, ctx: ContextoMapeo): SpecialRequest[] {
  const ejecucion = trabajo.ejecucion;
  const directorId = String(trabajo.director.usuarioId);
  const documento = (ruta: string | null, fecha: string): FileDocument[] =>
    ruta ? [aDocumentoDeRuta(trabajo.id, ruta, fecha, ctx, DocumentType.FORMATO)] : [];
  const solicitudes: SpecialRequest[] = [];
  ejecucion?.cambiosObjetivos.forEach((cambio, i) => solicitudes.push({
    id: `cambio-objetivos-${i}`,
    directorId,
    requestType: SpecialRequestType.CAMBIO_TITULO,
    requestDate: aFecha(cambio.fechaSolicitud) ?? new Date(),
    description: cambio.justificacion,
    status: estadoSolicitud(cambio.decision),
    documents: [],
    previousTitle: cambio.tituloAnterior,
    previousObjectives: [...cambio.objetivosAnteriores],
    proposedTitle: cambio.tituloPropuesto,
    proposedObjectives: [...cambio.objetivosPropuestos],
    ...decisionDeSolicitud(trabajo, cambio.decision, ctx)
  }));
  if (ejecucion?.prorroga) {
    const prorroga = ejecucion.prorroga;
    solicitudes.push({
      id: 'prorroga-0',
      directorId,
      requestType: SpecialRequestType.PRORROGA,
      requestDate: aFecha(prorroga.fechaSolicitud) ?? new Date(),
      description: `Prórroga de ${prorroga.meses} ${prorroga.meses === 1 ? 'mes' : 'meses'}`,
      status: estadoSolicitud(prorroga.decision),
      documents: documento(prorroga.rutaSolicitud, prorroga.fechaSolicitud),
      months: prorroga.meses,
      ...decisionDeSolicitud(trabajo, prorroga.decision, ctx)
    });
  }
  ejecucion?.suspensiones.forEach((suspension, i) => {
    solicitudes.push({
      id: `suspension-${i}`,
      directorId,
      requestType: SpecialRequestType.SUSPENSION,
      requestDate: aFecha(suspension.fechaSolicitud) ?? new Date(),
      description: 'Suspensión temporal del trabajo de grado',
      status: estadoSolicitud(suspension.decision),
      documents: documento(suspension.rutaSolicitud, suspension.fechaSolicitud),
      grantedDeadline: aFecha(suspension.fechaMaximaReanudacion) ?? undefined,
      ...decisionDeSolicitud(trabajo, suspension.decision, ctx)
    });
    if (suspension.fechaReanudacion) {
      solicitudes.push({
        id: `reanudacion-${i}`,
        directorId,
        requestType: SpecialRequestType.REANUDACION,
        requestDate: aFecha(suspension.fechaReanudacion) ?? new Date(),
        description: suspension.reanudacionAutomatica
          ? 'Reanudación automática al cumplirse el plazo máximo de la suspensión'
          : 'Reanudación del trabajo de grado registrada por el director',
        status: stateList.APROBADO,
        documents: documento(suspension.rutaReanudacion, suspension.fechaReanudacion)
      });
    }
  });
  trabajo.cancelaciones.forEach((cancelacion, i) => solicitudes.push({
    id: `cancelacion-${i}`,
    directorId,
    requestType: SpecialRequestType.CANCELACION,
    requestDate: aFecha(cancelacion.fechaSolicitud) ?? new Date(),
    description: 'Cancelación del trabajo de grado',
    status: estadoSolicitud(cancelacion.decision),
    documents: documento(cancelacion.rutaSolicitud, cancelacion.fechaSolicitud),
    ...decisionDeSolicitud(trabajo, cancelacion.decision, ctx)
  }));
  return solicitudes.sort((a, b) => b.requestDate.getTime() - a.requestDate.getTime());
}

// ── Sustentación (fase 6, solo lectura) ─────────────────────────────────────

/** Estado de la entrega final según el de la sustentación. */
function estadoEntregaFinal(estado: EstadoSustentacionApi): stateList {
  switch (estado) {
    case 'SOLICITADA':
    case 'PROGRAMADA': return stateList.EN_REVISION;
    case 'APLAZADA': return stateList.APLAZADO;
    case 'NO_APROBADA': return stateList.NO_APROBADO;
    default: return stateList.APROBADO;
  }
}

function entregasFinales(trabajo: TrabajoGradoResponse, ctx: ContextoMapeo): FinalDelivery[] {
  const sustentacion = trabajo.sustentacion;
  if (!sustentacion) return [];
  const documentoFinal = aDocumentoDeRuta(trabajo.id, sustentacion.rutaDocumentoFinal, sustentacion.fechaSolicitud,
    ctx, DocumentType.FORMATO_E);
  return [{
    id: 'entrega-final',
    uploadDate: aFecha(sustentacion.fechaSolicitud) ?? sustentacion.fechaSolicitud,
    monograph: documentoFinal,
    formatE: documentoFinal,
    annexes: sustentacion.rutaConceptoAsesor
      ? aDocumentoDeRuta(trabajo.id, sustentacion.rutaConceptoAsesor, sustentacion.fechaSolicitud, ctx,
        DocumentType.FORMATO)
      : undefined,
    status: estadoEntregaFinal(sustentacion.estado)
  }];
}

function pazYSalvos(trabajo: TrabajoGradoResponse, ctx: ContextoMapeo): PazYSalvoRegistry[] {
  const sustentacion = trabajo.sustentacion;
  if (!sustentacion) return [];
  return [{
    id: 'paz-y-salvo',
    academicApproved: true,
    financialApproved: true,
    document: {
      ...aDocumentoDeRuta(trabajo.id, sustentacion.rutaPazYSalvo, sustentacion.fechaSolicitud, ctx,
        DocumentType.PAZ_Y_SALVO),
      status: stateList.APROBADO
    },
    registrationDate: aFecha(sustentacion.fechaSolicitud) ?? new Date()
  }];
}

function entregasCorregidas(trabajo: TrabajoGradoResponse, ctx: ContextoMapeo): CorrectedDelivery[] {
  const sustentacion = trabajo.sustentacion;
  if (!sustentacion?.rutaAjustes || !sustentacion.fechaAjustes) return [];
  const verificaciones = sustentacion.verificaciones;
  let estado = stateList.EN_REVISION;
  if (verificaciones.some(v => !v.favorable)) estado = stateList.NO_APROBADO;
  else if (sustentacion.rutaVersionDefinitiva || verificaciones.length > 0) estado = stateList.APROBADO;
  return [{
    id: 'ajustes',
    uploadDate: aFecha(sustentacion.fechaAjustes) ?? sustentacion.fechaAjustes,
    monograph: aDocumentoDeRuta(trabajo.id, sustentacion.rutaAjustes, sustentacion.fechaAjustes, ctx,
      DocumentType.CORRECCION),
    status: estado
  }];
}

function sesionesDeSustentacion(trabajo: TrabajoGradoResponse, ctx: ContextoMapeo): SustentationRegistry[] {
  const sustentacion = trabajo.sustentacion;
  if (!sustentacion) return [];
  const ultima = sustentacion.sesiones.length;
  return sustentacion.sesiones.map((sesion): SustentationRegistry => {
    const fechaHora = aFecha(sesion.fechaHora);
    const calificaciones = sustentacion.calificaciones.filter(c => c.sesion === sesion.numero);
    return {
      id: `sesion-${sesion.numero}`,
      status: sesion.numero < ultima ? SustentationStatus.APLAZADA : estadoSesion(sustentacion.estado),
      sustentationDate: fechaHora ?? undefined,
      sustentationTime: fechaHora
        ? `${String(fechaHora.getHours()).padStart(2, '0')}:${String(fechaHora.getMinutes()).padStart(2, '0')}`
        : undefined,
      location: sesion.salon,
      assignedJurors: sesion.jurados.map(j => aUsuario(j.usuarioId, j.nombreCompleto, j.email, j.codigo, ctx)),
      verdicts: calificaciones.map((calificacion): JurorVerdict => ({
        jurorId: String(calificacion.juradoUsuarioId),
        evaluationDate: aFecha(calificacion.fecha) ?? new Date(),
        veredict: veredicto(calificacion.calificacion) as JurorVerdict['veredict'],
        observations: calificacion.observaciones ?? '',
        attachedDocument: calificacion.rutaActa
          ? aDocumentoDeRuta(trabajo.id, calificacion.rutaActa, calificacion.fecha, ctx, DocumentType.FORMATO_G)
          : undefined
      }))
    };
  });
}

function estadoSesion(estado: EstadoSustentacionApi): SustentationStatus {
  switch (estado) {
    case 'SOLICITADA':
    case 'PROGRAMADA': return SustentationStatus.PROGRAMADA;
    case 'APLAZADA': return SustentationStatus.APLAZADA;
    default: return SustentationStatus.REALIZADA;
  }
}

/** Versión definitiva (formato H) como documento de cierre del trabajo. */
function documentosDeCierre(trabajo: TrabajoGradoResponse, ctx: ContextoMapeo): FileDocument[] {
  const sustentacion = trabajo.sustentacion;
  if (!sustentacion?.rutaVersionDefinitiva || !sustentacion.fechaVersionDefinitiva) return [];
  return [{
    ...aDocumentoDeRuta(trabajo.id, sustentacion.rutaVersionDefinitiva, sustentacion.fechaVersionDefinitiva, ctx,
      DocumentType.FORMATO_H),
    status: stateList.APROBADO
  }];
}

// ── Estados ─────────────────────────────────────────────────────────────────

export function estaCerrado(trabajo: TrabajoGradoResponse): boolean {
  return ETAPAS_FINALES.includes(trabajo.etapa);
}

/** Estado del backend de la propuesta: el de su última versión, null si aún no se radica. */
export function estadoActualPropuesta(trabajo: TrabajoGradoResponse): EstadoApi | null {
  return ultimoEstado(trabajo.propuesta.versiones);
}

/** Estado de la última versión radicada, null si no hay ninguna. */
function ultimoEstado(versiones: VersionDocumentoApi[]): EstadoApi | null {
  return versiones.length > 0 ? versiones[versiones.length - 1].estado : null;
}

/** Estado de la propuesta: el de su última versión (en revisión o el concepto del Comité). */
export function estadoPropuesta(trabajo: TrabajoGradoResponse): stateList {
  const estado = estadoDeEntrega(estadoActualPropuesta(trabajo));
  if (estado === stateList.EN_REVISION && trabajo.etapa === 'CANCELADO') return stateList.CANCELADO;
  return estado;
}

/**
 * Estado del anteproyecto: el del Consejo si ya decidió; si los evaluadores lo
 * aprobaron y espera al Consejo, "Evaluado"; si no, el de su última entrega.
 */
export function estadoAnteproyecto(trabajo: TrabajoGradoResponse): stateList {
  if (trabajo.ejecucion) return stateList.APROBADO;
  if (trabajo.etapa === 'APROBACION_CONSEJO') return stateList.EVALUADO;
  // Aprobado por ambos evaluadores, pendiente de que el Jefe lo remita al Consejo
  if (trabajo.etapa === 'EVALUACION' && ultimoEstado(trabajo.anteproyecto.versiones) === 'APROBADO') {
    return stateList.EVALUADO;
  }
  if (trabajo.etapa === 'CANCELADO') return stateList.CANCELADO;
  return estadoDeEntrega(ultimoEstado(trabajo.anteproyecto.versiones));
}

/**
 * Estado de la remisión al Consejo de una versión: en revisión mientras el
 * Consejo no decide; aprobada o no aprobada según su decisión.
 */
function estadoRemision(trabajo: TrabajoGradoResponse, version: number): stateList {
  const remitida = trabajo.anteproyecto.versiones.find(v => v.version === version);
  if (remitida?.estado === 'NO_APROBADO') return stateList.NO_APROBADO;
  if (remitida?.estado === 'APROBADO' && trabajo.ejecucion) return stateList.APROBADO;
  return stateList.EN_REVISION;
}

/** Estado del trabajo de grado según su etapa. */
export function estadoTrabajo(etapa: ProcesoApi): stateList {
  switch (etapa) {
    case 'SUSPENDIDO': return stateList.SUSPENDIDO;
    case 'APLAZADO': return stateList.APLAZADO;
    case 'FINALIZADO': return stateList.APROBADO;
    case 'NO_APROBADO': return stateList.NO_APROBADO;
    case 'CANCELADO': return stateList.CANCELADO;
    default: return stateList.EN_DESARROLLO;
  }
}

function estadoDeEntrega(estado: EstadoApi | null): stateList {
  switch (estado) {
    case 'APROBADO': return stateList.APROBADO;
    case 'CON_CORRECCIONES': return stateList.APROBADO_CON_OBSERVACIONES;
    case 'NO_APROBADO':
    case 'RECHAZADO': return stateList.NO_APROBADO;
    default: return stateList.EN_REVISION;
  }
}

/** Resultado de un concepto, decisión o calificación del backend como veredicto del front. */
export function veredicto(resultado: ResultadoConceptoApi | CalificacionApi): stateList {
  switch (resultado) {
    case 'APROBADO': return stateList.APROBADO;
    case 'CON_CORRECCIONES':
    case 'APROBADO_CON_OBSERVACIONES': return stateList.APROBADO_CON_OBSERVACIONES;
    case 'APLAZADO': return stateList.APLAZADO;
    case 'EVALUADO': return stateList.EVALUADO;
    default: return stateList.NO_APROBADO;
  }
}

// ── Personas, documentos y evaluaciones ─────────────────────────────────────

/**
 * Participante como `User`: el usuario conocido si está en la lista; si no
 * (ej. asesor externo o usuario no cargado), uno armado con los datos del trabajo.
 */
export function aUsuario(usuarioId: number | null, nombreCompleto: string, email: string | null,
  codigo: string | null, ctx: ContextoMapeo): User {
  const conocido = usuarioId !== null ? ctx.usuarios.get(String(usuarioId)) : undefined;
  if (conocido) return conocido;
  const [primerNombre, ...resto] = nombreCompleto.trim().split(/\s+/);
  return {
    id: usuarioId !== null ? String(usuarioId) : `externo:${email ?? nombreCompleto}`,
    idType: '',
    idNumber: 0,
    firstName: primerNombre ?? '',
    secondName: '',
    lastName: resto.join(' '),
    secondLastName: '',
    codeNumber: Number(codigo) || 0,
    roles: [],
    email: email ?? '',
    state: UserState.active
  };
}

/** Tipo del front para cada tipo de documento del backend. */
const TIPOS_DOCUMENTO: Record<string, DocumentType> = {
  PROPUESTA: DocumentType.PROPUESTA,
  ANTEPROYECTO: DocumentType.ANTEPROYECTO,
  EVALUACION_ANTEPROYECTO: DocumentType.FORMATO_B,
  REMISION_CONSEJO: DocumentType.FORMATO_C,
  INFORME_MENSUAL: DocumentType.AVANCE,
  DOCUMENTO_FINAL: DocumentType.FORMATO_E,
  PAZ_Y_SALVO: DocumentType.PAZ_Y_SALVO,
  ACTA_SUSTENTACION: DocumentType.FORMATO_G,
  VERSION_DEFINITIVA: DocumentType.FORMATO_H,
  RESOLUCION: DocumentType.RESOLUCION,
  AJUSTES_SUSTENTACION: DocumentType.CORRECCION
};

export function tipoDocumento(tipoBackend: string): DocumentType {
  return TIPOS_DOCUMENTO[tipoBackend] ?? DocumentType.FORMATO;
}

/** Documento versionado del backend como `FileDocument`; su id es la ruta. */
export function aDocumento(trabajoId: number, documento: DocumentoApi, ctx: ContextoMapeo,
  tipo: DocumentType = tipoDocumento(documento.tipo)): FileDocument {
  return {
    id: documento.ruta,
    name: nombreDeRuta(documento.ruta),
    url: ctx.urlArchivo(trabajoId, documento.ruta),
    uploadDate: aFecha(documento.fechaCarga) ?? documento.fechaCarga,
    type: tipo,
    version: documento.version
  };
}

/** Archivo suelto (solicitudes, resoluciones, actas) como `FileDocument`. */
export function aDocumentoDeRuta(trabajoId: number, ruta: string, fecha: string, ctx: ContextoMapeo,
  tipo: DocumentType): FileDocument {
  return { id: ruta, name: nombreDeRuta(ruta), url: ctx.urlArchivo(trabajoId, ruta), uploadDate: aFecha(fecha) ?? fecha, type: tipo };
}

function aDocumentoFirmado(trabajoId: number, ruta: string, ctx: ContextoMapeo): FormattedDocument {
  return { name: nombreDeRuta(ruta), url: ctx.urlArchivo(trabajoId, ruta) };
}

const NOMBRES_ORGANO: Record<DecisionApi['organo'], { nombre: string; rol: UserRoleType }> = {
  COMITE_PROGRAMA: { nombre: 'Comité de Programa', rol: UserRoleType.COMITE },
  DEPARTAMENTO: { nombre: 'Departamento', rol: UserRoleType.JEFE_DEP },
  CONSEJO_FACULTAD: { nombre: 'Consejo de Facultad', rol: UserRoleType.CONSEJO }
};

/** Decisión de un órgano (Comité, Consejo) como evaluación del front. */
function evaluacionDeDecision(trabajo: TrabajoGradoResponse, decision: DecisionApi, indice: number,
  ctx: ContextoMapeo): Evaluation {
  const organo = NOMBRES_ORGANO[decision.organo];
  return {
    id: `${trabajo.id}-${decision.organo}-${indice}`,
    proposalId: String(trabajo.id),
    evaluatorId: '',
    evaluatorName: organo.nombre,
    evaluatorRole: organo.rol,
    veredict: veredicto(decision.resultado),
    observations: decision.observaciones ?? '',
    signedDocuments: decision.rutaArchivo ? [aDocumentoFirmado(trabajo.id, decision.rutaArchivo, ctx)] : [],
    date: aFecha(decision.fecha) ?? new Date()
  };
}

// ── Apoyo ───────────────────────────────────────────────────────────────────

/** "15/TI-A/v2/propuesta.pdf" → "propuesta" */
export function nombreDeRuta(ruta: string): string {
  const archivo = ruta.split('/').pop() ?? ruta;
  return archivo.replace(/\.pdf$/i, '');
}

/**
 * Fecha ISO del backend como `Date`. Las fechas sin hora (`2026-03-02`) se
 * toman en hora local, para que no se corran un día al mostrarse en Colombia.
 */
export function aFecha(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (soloFecha) return new Date(Number(soloFecha[1]), Number(soloFecha[2]) - 1, Number(soloFecha[3]));
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/** Fecha en que el trabajo entró a una etapa (según su historial). */
function fechaDeEntrada(trabajo: TrabajoGradoResponse, etapa: ProcesoApi): string | undefined {
  return trabajo.historial.find(cambio => cambio.destino === etapa)?.fecha;
}
