import { stateList } from "../../../core/enums/state.enum";
import { Archivable } from "../../../core/interfaces/archivable.interface";
import { FileDocument } from "../../../core/interfaces/file-document.interface";
import { Evaluation } from "../../../core/interfaces/evaluation.interface";
import { Proposal } from "../../proposal/interfaces/proposal.interface";
import { User } from "../../users/interfaces/user.interface";

/** Plazo de ejecución que puede fijar el Consejo y la fecha máxima de entrega que resultaría hoy. */
export interface ExecutionOption {
  months: number;
  deadline: Date;
}

export interface PreliminaryDraft extends Archivable {
  preliminaryDraftId?: string;
  proposalId: string;
  proposalData: Proposal;
  evaluators?: User[];
  evaluations: Evaluation[];
  documents: FileDocument[];
  state: stateList;
  createdData: Date;
  evaluationDeadline?: Date | string;
  /** Días hábiles que les quedan a los evaluadores (negativo si venció); los calcula el backend */
  evaluationRemainingDays?: number | null;
  /** Plazos que puede fijar el Consejo al aprobar y la fecha de entrega de cada uno (los calcula el backend) */
  executionOptions?: ExecutionOption[];
  maximumDeliveryDate?: Date | string;
  /** Documento del anteproyecto elegido en el formulario (aún no enviado al backend) */
  attachment?: File | null;
}
