import { Evaluation } from "../../../core/interfaces/evaluation.interface";
import { FileDocument } from "../../../core/interfaces/file-document.interface";
import { stateList } from "../../../core/enums/state.enum";
import { User } from "../../users/interfaces/user.interface";
import { Archivable } from "../../../core/interfaces/archivable.interface";
import { Modality } from "../enums/modality.enum";

export interface Proposal extends Archivable {
  id?: string;
  title: string;
  description: string;
  modality: Modality;
  lineOfResearch?: string;
  authors: User[];
  director: User;
  codirector?: User;
  advisor?: User;
  state: stateList;
  createdAt: Date;
  evaluationDeadline?: Date;
  documents: FileDocument[];
  evaluations: Evaluation[];
  isActive?: boolean;
}
