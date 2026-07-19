import { stateList } from "../../../core/enums/state.enum";
import { Archivable } from "../../../core/interfaces/archivable.interface";
import { FileDocument } from "../../../core/interfaces/file-document.interface";
import { Evaluation } from "../../../core/interfaces/evaluation.interface";
import { PreliminaryDraft } from "../../preliminary-draft/interfaces/preliminary-draft.interface";
import { FinalDelivery } from "./final-delivery.interface";
import { Advance } from "./advance.interface";
import { PazYSalvoRegistry } from "./paz-y-salvo-registry.interface";
import { CorrectedDelivery } from "./corrected-delivery.interface";
import { SustentationRegistry } from "./sustentation-registry.interface";
import { SpecialRequest } from "./special-request.interface";

export interface ThesisWork extends Archivable {
  thesisWorkId: string;
  preliminaryDraftId: string;
  preliminaryDraftData: PreliminaryDraft;
  documents: FileDocument[];
  advances?: Advance[];
  finalDeliveries?: FinalDelivery[];
  pazYSalvos?: PazYSalvoRegistry[];
  correctedDeliveries?: CorrectedDelivery[];
  evaluations: Evaluation[];
  sustentations?: SustentationRegistry[];
  specialRequests: SpecialRequest[];
  state: stateList;
  createdDate: Date;
}
