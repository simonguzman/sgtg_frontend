import { stateList } from "../../../core/enums/state.enum";
import { Archivable } from "../../../core/interfaces/archivable.interface";
import { FileDocument } from "../../../core/interfaces/file-document.interface";
import { Evaluation } from "../../../core/interfaces/evaluation.interface";
import { Proposal } from "../../proposal/interfaces/proposal.interface";
import { User } from "../../users/interfaces/user.interface";

/** Plazo de ejecución que puede fijar el Consejo y la fecha máxima de entrega que resultaría hoy. */
/**
 * Fechas entre las que el Consejo fija el plazo al aprobar: su reunión (desde
 * la remisión con el formato C hasta hoy) y la fecha máxima de entrega (de
 * `minMonths` a `maxMonths` meses después de la reunión).
 */
export interface CouncilTerm {
  startMin: Date | null;
  startMax: Date;
  minMonths: number;
  maxMonths: number;
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
  /** Solo en la aprobación del Consejo */
  councilTerm?: CouncilTerm | null;
  maximumDeliveryDate?: Date | string;
  /** Documento del anteproyecto elegido en el formulario (aún no enviado al backend) */
  attachment?: File | null;
}
