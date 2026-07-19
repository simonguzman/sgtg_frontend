import { stateList } from "../../../core/enums/state.enum";
import { FileDocument } from "../../../core/interfaces/file-document.interface";

export interface Advance {
  id: string;
  title: string;
  comments: string;
  uploadDate: Date | string;
  studentId: string;
  status: stateList;
  documents: FileDocument[];
}
