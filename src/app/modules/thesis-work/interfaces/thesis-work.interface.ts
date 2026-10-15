import { stateList } from "../../../core/enums/state.enum";
import { Archivable } from "../../../core/interfaces/archivable.interface";
import { FileDocument } from "../../../core/interfaces/file-document.interface";
import { Evaluation } from "../../../core/interfaces/evaluation.interface";
import { PreliminaryDraft } from "../../preliminary-draft/interfaces/preliminary-draft.interface";
import { FinalDelivery } from "./final-delivery.interface";
import { Advance } from "./advance.interface";
import { PazYSalvoRegistry } from "./paz-y-salvo-registry.interface";
import { CorrectedDelivery } from "./corrected-delivery.interface";
import { SustentationRegistry } from "./sustentation-registry.interface";
import { SpecialRequest } from "./special-request.interface";
import { EstadoSustentacionApi, ProcesoApi } from "../../../core/interfaces/api/trabajo-grado-api.interface";

/** Fechas del trabajo en curso calculadas por el backend. */
export interface ThesisWorkDeadlines {
  /** Notificación de la aprobación del anteproyecto (inicio del trabajo) */
  startDate: Date | null;
  /** Fecha máxima de entrega (incluye prórroga y suspensiones) */
  maximumDeliveryDate: Date | null;
  /** Desde cuándo se puede solicitar la sustentación */
  minimumSustentationDate: Date | null;
  /** Hasta cuándo se puede solicitar el cambio de título y objetivos (null si ya no aplica) */
  objectivesChangeDeadline: Date | null;
  /** Hasta cuándo se puede solicitar la prórroga (null si ya no aplica) */
  extensionRequestDeadline: Date | null;
}

/** Estado general de la sustentación (desde que el director la solicita). */
export interface SustentationProcess {
  state: EstadoSustentacionApi;
  requestDate: Date | null;
  /** Fecha límite para radicar los ajustes (aprobada con observaciones) */
  adjustmentsDeadline: Date | null;
  /** Fecha límite de la segunda sesión (aplazada) */
  secondSessionDeadline: Date | null;
  /** Jurado coordinador y jurados de la sesión actual */
  coordinatorId: string | null;
  jurorIds: string[];
  /** Fecha y hora de la sesión actual */
  currentSessionDate: Date | null;
  /** Hay una solicitud de nueva fecha pendiente de decisión del Consejo */
  hasPendingNewDate: boolean;
}

export interface ThesisWork extends Archivable {
  thesisWorkId: string;
  preliminaryDraftId: string;
  preliminaryDraftData: PreliminaryDraft;
  documents: FileDocument[];
  advances?: Advance[];
  finalDeliveries?: FinalDelivery[];
  pazYSalvos?: PazYSalvoRegistry[];
  correctedDeliveries?: CorrectedDelivery[];
  evaluations: Evaluation[];
  sustentations?: SustentationRegistry[];
  specialRequests: SpecialRequest[];
  state: stateList;
  createdDate: Date;
  /** Etapa del trabajo en el backend (EN_CURSO, PRORROGA, SUSPENDIDO…) */
  stage?: ProcesoApi;
  deadlines?: ThesisWorkDeadlines;
  /** Sustentación, null hasta que el director la solicita */
  sustentation?: SustentationProcess | null;
}
