import { DocumentType } from "../enums/document-type.enum";
import { stateList } from "../enums/state.enum";

/** Documento cargado en un trabajo, con su tipo, estado y versión. */
export interface FileDocument {
  id: string;
  name: string;
  url: string;
  uploadDate: string | Date;
  type: DocumentType
  status?: stateList;
  /** Número de versión del documento (iteración), si aplica */
  version?: number;
}
