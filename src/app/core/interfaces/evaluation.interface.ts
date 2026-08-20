import { EvaluationDeadlineStatus } from "../enums/evaluation-deadline-status.enum";
import { stateList } from "../enums/state.enum";
import { FormattedDocument } from "./formatted-document.interface";

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
