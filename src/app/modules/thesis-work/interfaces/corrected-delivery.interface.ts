import { stateList } from "../../../core/enums/state.enum";
import { FileDocument } from "../../../core/interfaces/file-document.interface";

/** Ajustes que radica el director tras una sustentación aprobada con observaciones. */
export interface CorrectedDelivery {
  id: string;
  uploadDate: Date | string;
  monograph: FileDocument;
  annexes?: FileDocument;
  status: stateList;
  /** Verificación del jurado coordinador, si ya la registró */
  verification?: { favorable: boolean; observations: string; jurorName: string; date: Date };
}
