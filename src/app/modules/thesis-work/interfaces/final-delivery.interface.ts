import { stateList } from "../../../core/enums/state.enum";
import { FileDocument } from "../../../core/interfaces/file-document.interface";

/** Solicitud de sustentación del director (entrega final). */
export interface FinalDelivery {
  id: string;
  uploadDate: Date | string;
  monograph: FileDocument;
  formatE: FileDocument;
  annexes?: FileDocument;
  pazYSalvo?: FileDocument;
  /** Concepto favorable del asesor (práctica profesional) */
  advisorConcept?: FileDocument;
  status: stateList;
}
