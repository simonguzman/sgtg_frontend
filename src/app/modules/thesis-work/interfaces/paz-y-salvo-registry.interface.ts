import { FileDocument } from "../../../core/interfaces/file-document.interface";

export interface PazYSalvoRegistry {
  id: string;
  academicApproved: boolean;
  academicComments?: string;
  financialApproved: boolean;
  financialComments?: string;
  document: FileDocument;
  registrationDate: Date;
}
