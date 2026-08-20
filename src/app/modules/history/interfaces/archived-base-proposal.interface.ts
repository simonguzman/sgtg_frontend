import { User } from '../../users/interfaces/user.interface';

/**
 * Forma común que expone una Proposal, un PreliminaryDraft.proposalData o
 * un ThesisWork.preliminaryDraftData.proposalData — los 3 tipos de origen
 * que puede tener un registro archivado. Se centraliza aquí porque tanto
 * los 3 servicios de tab del Historial (para el chequeo de permisos) como
 * el resolver de ArchivedProcessComponent (para formatear la vista de
 * detalle) necesitan exactamente esta misma forma.
 */
export interface ArchivedBaseProposal {
  title?: string;
  modality?: string;
  authors?: (string | User)[];
  director?: User;
  codirector?: User;
  advisor?: User;
}
