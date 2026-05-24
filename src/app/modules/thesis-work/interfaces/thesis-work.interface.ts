import { stateList } from "../../../core/enums/state.enum";
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

// --- NUEVA INTERFAZ PARA AVANCES ---
export interface Advance {
  id: string;
  title: string;
  comments: string;
  uploadDate: Date | string;
  studentId: string;
  status: stateList;
  documents: Document[]; // Aprovechamos la interfaz genérica de Document
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
  sustentationDate?: Date;
  sustentationTime?: string;
  location?: string;
  assignedJurors: User[];
  formatEDocument?: Document;
  verdicts: JurorVerdict[];
}

export interface SpecialRequest {
  id: string;
  directorId: string;
  requestDate: Date;
  description: string;
  status: stateList.EN_REVISION | stateList.APROBADO | stateList.NO_APROBADO;
  resolutionDetails?: string;
}

export interface ThesisWork {
  thesisWorkId: string;
  preliminaryDraftId: string;
  preliminaryDraftData: PreliminaryDraft;

  // CENTRALIZACIÓN DE DOCUMENTOS GLOBALES
  documents: Document[];

  // --- NUEVO: COLECCIÓN DE AVANCES ---
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
