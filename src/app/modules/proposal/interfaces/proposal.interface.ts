import { Evaluation } from "../../../core/interfaces/evaluation.interface";
import { Document } from "../../../core/interfaces/Document.interface";
import { stateList } from "../../../core/enums/state.enum";
import { User } from "../../users/interfaces/user.interface";
import { Archivable } from "../../../core/interfaces/archivable.interface";

export enum Modality{
  TI = 'Trabajo de investigación',
  PP = 'Practica profesional'
}

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
  documents: Document[];
  evaluations: Evaluation[];
  isActive?: boolean;
}
