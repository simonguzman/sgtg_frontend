import { FileDocument } from "../../../core/interfaces/file-document.interface";

/** Revisión del paz y salvo (formato F) por Decanatura. */
export interface PazYSalvoRegistry {
  id: string;
  academicApproved: boolean;
  academicComments?: string;
  financialApproved: boolean;
  financialComments?: string;
  document: FileDocument;
  registrationDate: Date;
}
