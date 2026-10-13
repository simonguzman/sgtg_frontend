import {
  CalificacionApi, DecisionApi, DocumentoApi, EstadoApi, VersionDocumentoApi, ETAPAS_FINALES, ProcesoApi, ResultadoConceptoApi,
  TrabajoGradoResponse
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

/** @returns el trabajo de grado, o null si el Consejo aún no aprueba el anteproyecto */
export function aTrabajoDeGrado(trabajo: TrabajoGradoResponse, ctx: ContextoMapeo): ThesisWork | null {
  const anteproyecto = aAnteproyecto(trabajo, ctx);
  if (!trabajo.ejecucion || !anteproyecto) return null;
  const id = String(trabajo.id);
  return {
    thesisWorkId: id,
    preliminaryDraftId: id,
    preliminaryDraftData: anteproyecto,
    documents: [],
    advances: [],
    finalDeliveries: [],
    pazYSalvos: [],
    correctedDeliveries: [],
    evaluations: [],
    sustentations: [],
    specialRequests: [],
    state: estadoTrabajo(trabajo.etapa),
    createdDate: aFecha(trabajo.ejecucion.fechaNotificacion) ?? new Date(),
    isArchived: estaCerrado(trabajo)
  };
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
