import { stateList } from "../../../core/enums/state.enum";
import { FileDocument } from "../../../core/interfaces/file-document.interface";

/**
 * Informe mensual de avance del trabajo en curso. Su id es el número del
 * informe en el backend; sus revisiones están en `ThesisWork.evaluations`
 * (con `advanceId` = id del informe).
 */
export interface Advance {
  id: string;
  title: string;
  comments: string;
  uploadDate: Date | string;
  studentId: string;
  /** Nombre de quien radicó el informe */
  uploadedBy?: string;
  /** En revisión mientras nadie lo revisa; Evaluado cuando tiene al menos una revisión */
  status: stateList;
  documents: FileDocument[];
}
