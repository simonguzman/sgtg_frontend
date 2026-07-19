import { stateList } from "../../../core/enums/state.enum";
import { FileDocument } from "../../../core/interfaces/file-document.interface";

export interface FinalDelivery {
  id: string;
  uploadDate: Date | string;
  monograph: FileDocument;
  formatE: FileDocument;
  annexes?: FileDocument;
  status: stateList;
}
