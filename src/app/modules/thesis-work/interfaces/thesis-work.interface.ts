import { stateList } from "../../../core/enums/state.enum";
import { Document } from "../../../core/interfaces/Document.interface";
import { Evaluation } from "../../../core/interfaces/evaluation.interface";
import { PreliminaryDraft } from "../../preliminary-draft/interfaces/preliminary-draft.interface";
import { User } from "../../users/interfaces/user.interface";

// --- NUEVA INTERFAZ PARA AVANCES ---
export interface Advance {
  id: string;
  title: string;
  comments: string;
  uploadDate: Date;
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
  documentId: string;
  registrationDate: Date;
}

export interface JurorVerdict {
  jurorId: string;
  evaluationDate: Date;
  veredict: stateList.APROBADO | stateList.APROBADO_CON_OBSERVACIONES | stateList.NO_APROBADO | stateList.APLAZADO;
  observations: string;
}

export interface SustentationRegistry {
  id: string;
  sustentationDate?: Date;
  sustentationTime?: string;
  location?: string;
  assignedJurors: User[];
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
  pazYSalvo?: PazYSalvoRegistry;

  evaluations: Evaluation[];
  sustentations?: SustentationRegistry[];
  specialRequests: SpecialRequest[];
  state: stateList;
  createdDate: Date;
}
