import { stateList } from "../enums/state.enum";

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
  signedDocuments?: string[];
  date: Date;
}
