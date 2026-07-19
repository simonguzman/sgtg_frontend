import { stateList } from "../../../core/enums/state.enum";
import { FileDocument } from "../../../core/interfaces/file-document.interface";

export interface CorrectedDelivery {
  id: string;
  uploadDate: Date | string;
  monograph: FileDocument;
  annexes?: FileDocument;
  status: stateList;
}
