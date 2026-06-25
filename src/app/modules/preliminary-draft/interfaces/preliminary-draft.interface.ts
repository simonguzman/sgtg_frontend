import { stateList } from "../../../core/enums/state.enum";
import { Archivable } from "../../../core/interfaces/archivable.interface";
import { Document } from "../../../core/interfaces/Document.interface";
import { Evaluation } from "../../../core/interfaces/evaluation.interface";
import { Proposal } from "../../proposal/interfaces/proposal.interface";
import { User } from "../../users/interfaces/user.interface";

export interface PreliminaryDraft extends Archivable {
  preliminaryDraftId?: string;
  proposalId: string;
  proposalData: Proposal;
  evaluators?: User[];
  evaluations: Evaluation[];
  documents: Document[];
  state: stateList;
  createdData: Date;
  evaluationDeadline?: Date | string;
  maximumDeliveryDate?: Date | string;
}
