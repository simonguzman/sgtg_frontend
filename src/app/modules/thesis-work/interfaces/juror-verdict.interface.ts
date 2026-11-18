import { stateList } from "../../../core/enums/state.enum";
import { FileDocument } from "../../../core/interfaces/file-document.interface";

/** Calificación de un jurado en una sesión de sustentación. */
export interface JurorVerdict {
  jurorId: string;
  evaluationDate: Date;
  veredict: stateList.APROBADO | stateList.APROBADO_CON_OBSERVACIONES | stateList.NO_APROBADO | stateList.APLAZADO;
  observations: string;
  attachedDocument?: FileDocument;
}
