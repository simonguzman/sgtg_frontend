import { stateList } from "../../../core/enums/state.enum";
import { FileDocument } from "../../../core/interfaces/file-document.interface";
import { SpecialRequestType } from "../enums/special-request-type.enum";

/**
 * Solicitud del director durante el trabajo en curso (cambio de título y
 * objetivos, prórroga, suspensión, reanudación o cancelación). La decide el
 * Consejo de Facultad con una resolución, salvo la reanudación, que solo se
 * registra. El cambio de título y objetivos lo avala antes el Comité del
 * programa: si no lo avala, queda no aprobado sin pasar al Consejo.
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
  /** Quién debe decidir la solicitud pendiente (el Comité solo en el cambio de título y objetivos) */
  pendingWith?: 'COMITE' | 'CONSEJO';
  /** Cambio de título y objetivos: aval del Comité del programa, si ya lo dio */
  committeeEndorsement?: CommitteeEndorsement;
}

/** Aval del Comité del programa sobre el cambio de título y objetivos. */
export interface CommitteeEndorsement {
  endorsed: boolean;
  observations?: string;
  date?: Date;
  /** Acta o concepto del Comité, opcional */
  document?: FileDocument;
}
