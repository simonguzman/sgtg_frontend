import { stateList } from "../../../core/enums/state.enum";
import { Archivable } from "../../../core/interfaces/archivable.interface";
import { Document } from "../../../core/interfaces/Document.interface";
import { Evaluation } from "../../../core/interfaces/evaluation.interface";
import { PreliminaryDraft } from "../../preliminary-draft/interfaces/preliminary-draft.interface";
import { User } from "../../users/interfaces/user.interface";

export interface FinalDelivery {
  id: string;
  uploadDate: Date | string;
  monograph: Document;
  formatE: Document;
  annexes?: Document;
  status: stateList;
}

export interface Advance {
  id: string;
  title: string;
  comments: string;
  uploadDate: Date | string;
  studentId: string;
  status: stateList;
  documents: Document[];
}

export interface PazYSalvoRegistry {
  id: string;
  academicApproved: boolean;
  academicComments?: string;
  financialApproved: boolean;
  financialComments?: string;
  document: Document;
  registrationDate: Date;
}

export interface JurorVerdict {
  jurorId: string;
  evaluationDate: Date;
  veredict: stateList.APROBADO | stateList.APROBADO_CON_OBSERVACIONES | stateList.NO_APROBADO | stateList.APLAZADO;
  observations: string;
  attachedDocument?: Document;
}

export interface CorrectedDelivery {
  id: string;
  uploadDate: Date | string;
  monograph: Document;
  annexes?: Document;
  status: stateList;
}

export interface SustentationRegistry {
  id: string;
  status?: SustentationStatus; // 👈 NUEVO: Para saber si la cancelamos por la solicitud especial
  sustentationDate?: Date;
  sustentationTime?: string;
  location?: string;
  assignedJurors: User[];
  formatEDocument?: Document;
  verdicts: JurorVerdict[];
}


// 👈 NUEVO: Para identificar exactamente qué regla de negocio disparar
export enum SpecialRequestType {
  PRORROGA = 'Prórroga',
  SUSPENSION = 'Suspensión',
  CANCELACION = 'Cancelación del trabajo de grado',
  NUEVA_SUSTENTACION = 'Nueva fecha de sustentación',
  CAMBIO_TITULO = 'Cambios de títulos y objetivos'
}

// 👈 NUEVO: Para poder cancelar una sustentación sin borrar el registro
export enum SustentationStatus {
  PROGRAMADA = 'Programada',
  REALIZADA = 'Realizada',
  CANCELADA = 'Cancelada',
  APLAZADA = 'Aplazada'
}

export interface SpecialRequest {
  id: string;
  directorId: string;
  requestType: SpecialRequestType; // 👈 NUEVO: Obligatorio para saber qué pidió el director
  requestDate: Date;
  description: string;
  status: stateList.EN_REVISION | stateList.APROBADO | stateList.NO_APROBADO;
  resolutionDetails?: string;
  grantedDeadline?: Date | string; // 👈 NUEVO: Opcional, para guardar en el historial la fecha extra que dio el consejo (útil en prórrogas/suspensiones)
  evaluatorId?: string;
}

export interface ThesisWork extends Archivable {
  thesisWorkId: string;
  preliminaryDraftId: string;
  preliminaryDraftData: PreliminaryDraft;
  documents: Document[];
  advances?: Advance[];
  finalDeliveries?: FinalDelivery[];
  pazYSalvos?: PazYSalvoRegistry[];
  correctedDeliveries?: CorrectedDelivery[];
  evaluations: Evaluation[];
  sustentations?: SustentationRegistry[];
  specialRequests: SpecialRequest[];
  state: stateList;
  createdDate: Date;
}
