import { CatalogoResponse, TipoVinculacionApi } from './auth-api.interface';

/**
 * Contratos del backend para los trabajos de grado (`TrabajoGradoDTOResponse`
 * y sus registros anidados). Un solo trabajo contiene todas sus etapas: el
 * front construye con él las vistas de propuesta, anteproyecto y trabajo de
 * grado (`core/mappers/trabajo-grado.mapper.ts`). Las fechas llegan como
 * texto ISO (`2026-03-02`, `2026-03-02T10:00:00`).
 */

export type ModalidadApi = 'TRABAJO_DE_INVESTIGACION' | 'PRACTICA_PROFESIONAL';

/** Etapa del trabajo (`Proceso`). */
export type ProcesoApi =
  | 'PROPUESTA' | 'ANTEPROYECTO' | 'EVALUACION' | 'APROBACION_CONSEJO' | 'EN_CURSO' | 'PRORROGA'
  | 'SUSPENDIDO' | 'SUSTENTACION' | 'APLAZADO' | 'FINALIZADO' | 'NO_APROBADO' | 'CANCELADO';

/** Estado de una entrega dentro de su etapa (`Estado`). */
export type EstadoApi = 'EN_REVISION' | 'CON_CORRECCIONES' | 'APROBADO' | 'RECHAZADO' | 'NO_APROBADO';

export type ResultadoConceptoApi = 'APROBADO' | 'CON_CORRECCIONES' | 'RECHAZADO' | 'EVALUADO' | 'NO_APROBADO';
export type CalificacionApi = 'APROBADO' | 'APROBADO_CON_OBSERVACIONES' | 'APLAZADO' | 'NO_APROBADO';
export type EstadoSustentacionApi =
  | 'SOLICITADA' | 'PROGRAMADA' | 'EN_AJUSTES' | 'AJUSTES_RADICADOS' | 'APROBADA' | 'APLAZADA' | 'FINALIZADA' | 'NO_APROBADA';
export type MotivoCierreApi =
  | 'VENCIMIENTO_PLAZO' | 'SUSTENTACION_NO_APROBADA' | 'INASISTENCIA_SUSTENTACION' | 'CANCELACION_ESTUDIANTE'
  | 'CANCELACION_DIRECTOR' | 'ANULACION_DIRECTOR';
export type OrganoApi = 'COMITE_PROGRAMA' | 'DEPARTAMENTO' | 'CONSEJO_FACULTAD';

export interface EstudianteApi {
  usuarioId: number;
  codigo: string;
  nombreCompleto: string;
  email: string;
  programa: CatalogoResponse | null;
}

export interface DirectorApi {
  usuarioId: number;
  codigo: string;
  nombreCompleto: string;
  email: string;
  tipoVinculacion: TipoVinculacionApi;
  departamento: CatalogoResponse | null;
}

export interface AsesorApi {
  usuarioId: number | null;
  codigo: string | null;
  nombreCompleto: string;
  email: string | null;
  organizacion: string | null;
  externo: boolean;
}

/** Persona que evalúa o califica (evaluador del anteproyecto o jurado). */
export interface EvaluadorApi {
  usuarioId: number;
  codigo: string;
  nombreCompleto: string;
  email: string;
}

/** Versión de un documento. `ruta` se descarga con `GET /trabajos-grado/{id}/archivos?ruta=`. */
export interface DocumentoApi {
  tipo: string;
  /** Código del formato del reglamento (ej. `TI-A`), null si no aplica */
  formato: string | null;
  ruta: string;
  version: number;
  fechaCarga: string;
}

export interface DecisionApi {
  organo: OrganoApi;
  resultado: ResultadoConceptoApi;
  acta: string | null;
  rutaArchivo: string | null;
  observaciones: string | null;
  fecha: string;
  /** Fecha límite que tenía el órgano para decidir (solo el concepto del Comité sobre la propuesta) */
  fechaLimite?: string | null;
  /** true si decidió dentro del plazo; null si la decisión no tiene plazo */
  aTiempo?: boolean | null;
  /** Usuario que registró la decisión en nombre del órgano; null en las anteriores a este dato */
  responsableId?: number | null;
}

/**
 * Versión de un documento enviado a revisión (propuesta o anteproyecto) con el
 * estado de su revisión: EN_REVISION, APROBADO, NO_APROBADO o CON_CORRECCIONES.
 */
export interface VersionDocumentoApi extends DocumentoApi {
  estado: EstadoApi;
}

/** Propuesta: su estado es el de la última versión radicada (sin versiones no hay estado). */
export interface PropuestaApi {
  fechaLimiteConcepto: string | null;
  /** Días hábiles que le quedan al Comité (negativo si venció), calculados por el backend; null sin versión en revisión */
  diasHabilesRestantesConcepto?: number | null;
  versiones: VersionDocumentoApi[];
  decisiones: DecisionApi[];
}

export interface ConceptoEvaluacionApi {
  version: number;
  evaluadorUsuarioId: number;
  evaluador: string;
  resultado: ResultadoConceptoApi;
  observaciones: string | null;
  fecha: string;
  /** Formato B del evaluador */
  formato: DocumentoApi | null;
  /** Documento opcional con las anotaciones del evaluador */
  anotaciones: DocumentoApi | null;
  /** Fecha límite que tenía el evaluador para esa versión */
  fechaLimite?: string | null;
  /** true si emitió el concepto dentro del plazo; null si no se conoce */
  aTiempo?: boolean | null;
}

/** Plazo que puede fijar el Consejo al aprobar, con la fecha máxima de entrega que resultaría hoy. */
export interface OpcionPlazoApi {
  meses: number;
  fechaFin: string;
}

/** Anteproyecto: su estado es el de la última versión radicada (sin versiones no hay estado). */
export interface AnteproyectoApi {
  fechaLimiteEvaluacion: string | null;
  /** Días hábiles que les quedan a los evaluadores (negativo si venció); null fuera de la evaluación */
  diasHabilesRestantesEvaluacion?: number | null;
  fechaLimiteCorrecciones: string | null;
  /** Días hábiles que le quedan al director para las correcciones; null si no hay correcciones pendientes */
  diasHabilesRestantesCorrecciones?: number | null;
  versiones: VersionDocumentoApi[];
  evaluadores: EvaluadorApi[];
  conceptos: ConceptoEvaluacionApi[];
  decisionesConsejo: DecisionApi[];
  /** Formatos C con los que el Jefe de departamento remitió al Consejo cada versión aprobada (`version` = versión remitida) */
  remisiones: DocumentoApi[];
  /** Plazos que puede fijar el Consejo; vacía fuera de la aprobación del Consejo */
  opcionesPlazo?: OpcionPlazoApi[];
}

export interface CambioObjetivosApi {
  tituloAnterior: string;
  objetivosAnteriores: string[];
  tituloPropuesto: string;
  objetivosPropuestos: string[];
  justificacion: string;
  fechaSolicitud: string;
  decision: DecisionApi | null;
}

/** Revisión de un informe mensual por el director, el codirector o el asesor (no cambia la etapa). */
export interface RevisionInformeApi {
  revisorUsuarioId: number;
  revisor: string;
  observaciones: string | null;
  /** PDF con las notas del revisor, null si no adjuntó */
  rutaArchivo: string | null;
  fecha: string;
}

/** Informe mensual de avance: lo radica un estudiante (en práctica profesional también el director). */
export interface InformeMensualApi {
  numero: number;
  rutaArchivo: string;
  fecha: string;
  /** Código de quien lo radicó */
  radicadoPor: string | null;
  observaciones: string | null;
  revisiones: RevisionInformeApi[];
}

export interface SuspensionApi {
  rutaSolicitud: string;
  fechaSolicitud: string;
  decision: DecisionApi | null;
  fechaInicio: string | null;
  etapaPrevia: ProcesoApi | null;
  diasRestantes: number | null;
  fechaMaximaReanudacion: string | null;
  fechaReanudacion: string | null;
  rutaReanudacion: string | null;
  reanudacionAutomatica: boolean;
}

export interface ProrrogaApi {
  meses: number;
  rutaSolicitud: string;
  fechaSolicitud: string;
  decision: DecisionApi | null;
}

export interface EjecucionApi {
  fechaNotificacion: string;
  fechaFin: string;
  fechaMinimaSustentacion: string;
  fechaLimiteCambioObjetivos: string | null;
  fechaLimiteSolicitudProrroga: string | null;
  cambiosObjetivos: CambioObjetivosApi[];
  informesMensuales: InformeMensualApi[];
  prorroga: ProrrogaApi | null;
  suspensiones: SuspensionApi[];
}

/** Sesión de sustentación: el primer jurado es el coordinador (califica y registra las decisiones). */
export interface SesionSustentacionApi {
  numero: number;
  jurados: EvaluadorApi[];
  juradoCoordinadorId: number;
  fechaHora: string;
  salon: string;
  fechaProgramacion: string;
  /** Formato E que adjuntó el Consejo al programar */
  rutaFormatoE: string | null;
}

/** Solicitud del director de una nueva fecha para la sesión, que decide el Consejo. */
export interface SolicitudNuevaFechaApi {
  sesion: number;
  rutaSolicitud: string;
  fechaSolicitud: string;
  /** Fecha y hora de la sesión al solicitar */
  fechaHoraAnterior: string;
  decision: DecisionApi | null;
  /** Fecha y hora aprobadas, null si no se aprobó */
  nuevaFechaHora: string | null;
  nuevoSalon: string | null;
}

export interface CalificacionJuradoApi {
  sesion: number;
  juradoUsuarioId: number;
  jurado: string;
  calificacion: CalificacionApi;
  observaciones: string | null;
  rutaActa: string | null;
  fecha: string;
}

export interface RegistroJuradoApi {
  sesion: number;
  juradoUsuarioId: number;
  jurado: string;
  favorable: boolean;
  observaciones: string | null;
  fecha: string;
}

/** Revisión del paz y salvo (formato F) de Decanatura. */
export interface RevisionPazYSalvoApi {
  rutaDocumento: string;
  aprobado: boolean;
  observaciones: string | null;
  fecha: string;
}

export interface SustentacionApi {
  estado: EstadoSustentacionApi;
  /** Monografía que acompaña al formato E */
  rutaMonografia: string | null;
  /** Documento final (formato E) */
  rutaDocumentoFinal: string;
  /** Paz y salvo aprobado por Decanatura, null mientras no lo apruebe */
  rutaPazYSalvo: string | null;
  /** Revisiones del paz y salvo de Decanatura, en orden */
  revisionesPazYSalvo: RevisionPazYSalvoApi[];
  rutaConceptoAsesor: string | null;
  rutaAnexos: string | null;
  fechaSolicitud: string;
  sesiones: SesionSustentacionApi[];
  solicitudesNuevaFecha: SolicitudNuevaFechaApi[];
  calificaciones: CalificacionJuradoApi[];
  inasistencias: RegistroJuradoApi[];
  verificaciones: RegistroJuradoApi[];
  rutaAjustes: string | null;
  rutaAnexosAjustes: string | null;
  fechaAjustes: string | null;
  fechaLimiteAjustes: string | null;
  /** Días hábiles que le quedan al director para los ajustes; null si no hay ajustes pendientes */
  diasHabilesRestantesAjustes?: number | null;
  fechaLimiteSegundaSesion: string | null;
  rutaVersionDefinitiva: string | null;
  fechaVersionDefinitiva: string | null;
  motivoNoAprobacion: MotivoCierreApi | null;
  /**
   * Solicitudes cuyo paz y salvo no aprobó Decanatura y que el director
   * reemplazó por una nueva, en orden (la revisión i del paz y salvo es de la solicitud i)
   */
  solicitudesAnteriores?: SolicitudSustentacionApi[];
  /** Decanatura no aprobó el paz y salvo de la solicitud vigente: el director radica una nueva */
  solicitudNoAprobada?: boolean;
}

/** Solicitud de sustentación anterior (su paz y salvo no se aprobó). */
export interface SolicitudSustentacionApi {
  rutaMonografia: string | null;
  rutaDocumentoFinal: string;
  rutaConceptoAsesor: string | null;
  rutaAnexos: string | null;
  fechaSolicitud: string;
}

export interface CancelacionApi {
  rutaSolicitud: string;
  fechaSolicitud: string;
  etapaAlSolicitar: ProcesoApi;
  decision: DecisionApi | null;
}

export interface CambioEtapaApi {
  origen: ProcesoApi;
  destino: ProcesoApi;
  fecha: string;
  responsable: string;
  observacion: string | null;
}

/** Trabajo de grado completo (`TrabajoGradoDTOResponse`). */
export interface TrabajoGradoResponse {
  id: number;
  modalidad: ModalidadApi;
  titulo: string;
  /** El primero es el objetivo general; los demás, los específicos */
  objetivos: string[];
  descripcion: string | null;
  lineaInvestigacion: string | null;
  etapa: ProcesoApi;
  motivoCierre: MotivoCierreApi | null;
  estudiantes: EstudianteApi[];
  director: DirectorApi;
  codirector: DirectorApi | null;
  asesor: AsesorApi | null;
  cartaAceptacion: DocumentoApi | null;
  propuesta: PropuestaApi;
  anteproyecto: AnteproyectoApi;
  ejecucion: EjecucionApi | null;
  sustentacion: SustentacionApi | null;
  cancelaciones: CancelacionApi[];
  historial: CambioEtapaApi[];
}

/** Etapas en las que el director puede anular el trabajo (antes de la aprobación del Consejo). */
export const ETAPAS_ANULABLES: readonly ProcesoApi[] = ['PROPUESTA', 'ANTEPROYECTO', 'EVALUACION', 'APROBACION_CONSEJO'];

/** Etapas finales: el trabajo queda cerrado. */
export const ETAPAS_FINALES: readonly ProcesoApi[] = ['FINALIZADO', 'NO_APROBADO', 'CANCELADO'];
