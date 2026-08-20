import { FileDocument } from "../../../../../core/interfaces/file-document.interface";

export interface ArchivedRecordView {
  title: string;
  modality: string;
  status: string;
  studentName: string;
  directorName: string;
  codirectorName?: string;
  advisorName?: string;
  documents: FileDocument[];
}
