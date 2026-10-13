import { stateList } from "../../../core/enums/state.enum";
import { FileDocument } from "../../../core/interfaces/file-document.interface";
import { SpecialRequestType } from "../enums/special-request-type.enum";

/**
 * Solicitud del director durante el trabajo en curso (cambio de título y
 * objetivos, prórroga, suspensión, reanudación o cancelación). La decide el
 * Consejo de Facultad con una resolución, salvo la reanudación, que solo se
 * registra.
 */
export interface SpecialRequest {
  id: string;
  directorId: string;
  requestType: SpecialRequestType;
  requestDate: Date;
  description: string;
  status: stateList.EN_REVISION | stateList.APROBADO | stateList.NO_APROBADO;
  resolutionDetails?: string;
  grantedDeadline?: Date | string;
  evaluatorId?: string;
  /** Documento de la solicitud (formato o carta del director) */
  documents?: FileDocument[];
  /** Resolución del Consejo, si ya decidió */
  resolution?: FileDocument;
  /** Fecha de la decisión del Consejo */
  resolutionDate?: Date;
  /** Prórroga: meses solicitados */
  months?: number;
  /** Cambio de título y objetivos: lo vigente al solicitar y lo propuesto */
  previousTitle?: string;
  previousObjectives?: string[];
  proposedTitle?: string;
  proposedObjectives?: string[];
}
