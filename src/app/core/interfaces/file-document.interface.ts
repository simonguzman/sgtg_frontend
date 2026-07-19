import { DocumentType } from "../enums/document-type.enum";
import { stateList } from "../enums/state.enum";

export interface FileDocument {
  id: string;
  name: string;
  url: string;
  uploadDate: string | Date;
  type: DocumentType
  status?: stateList;
}
