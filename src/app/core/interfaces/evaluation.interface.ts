import { EvaluationDeadlineStatus } from "../enums/evaluation-deadline-status.enum";
import { stateList } from "../enums/state.enum";
import { FormattedDocument } from "./formatted-document.interface";

/**
 * Evaluación o decisión sobre un documento del trabajo (concepto del Comité, de un evaluador, decisión del
 * Consejo, revisión de un informe...).
 */
export interface Evaluation {
  id: string;
  proposalId: string;
  advanceId?: string;
  documentId?: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluatorRole: string;
  veredict: stateList;
  observations: string;
  signedDocuments?: FormattedDocument[];
  date: Date;
  deadlineStatus?: EvaluationDeadlineStatus;
}
