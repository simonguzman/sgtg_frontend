import { Evaluation } from "../../../core/interfaces/evaluation.interface";
import { FileDocument } from "../../../core/interfaces/file-document.interface";
import { stateList } from "../../../core/enums/state.enum";
import { User } from "../../users/interfaces/user.interface";
import { Archivable } from "../../../core/interfaces/archivable.interface";
import { Modality } from "../enums/modality.enum";

/** Archivos elegidos en el formulario, pendientes de enviar al backend (no vienen del backend). */
export interface ProposalAttachments {
  /** Formato A de la propuesta */
  proposal?: File | null;
  /** Carta de aceptación de la organización (práctica profesional) */
  acceptanceLetter?: File | null;
}

export interface Proposal extends Archivable {
  id?: string;
  title: string;
  /** Descripción general; si no tiene, el objetivo general */
  description: string;
  /** El primero es el objetivo general; los demás, los específicos */
  objectives?: string[];
  /** Organización del asesor (práctica profesional) */
  organization?: string;
  attachments?: ProposalAttachments;
  modality: Modality;
  lineOfResearch?: string;
  authors: User[];
  director: User;
  codirector?: User;
  advisor?: User;
  state: stateList;
  createdAt: Date;
  evaluationDeadline?: Date;
  /** Días hábiles que le quedan al Comité (negativo si venció); los calcula el backend */
  evaluationRemainingDays?: number | null;
  documents: FileDocument[];
  evaluations: Evaluation[];
  isActive?: boolean;
}
