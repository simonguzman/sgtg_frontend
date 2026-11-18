import { Column, TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';

/** Usuario en sesión, con lo que necesitan las estrategias de las pestañas. */
export interface TabCurrentUser {
  id: string;
  firstName: string;
  lastName: string;
  roles?: string[];
}

/**
 * Datos con los que cada pestaña decide sus filas y botones: el anteproyecto, el papel del usuario en él y
 * las versiones vigentes.
 */
export interface PreliminaryDraftEvaluationContext {
  preliminaryDraft: PreliminaryDraft;
  currentUser: TabCurrentUser | null;
  isAdmin: boolean;
  isJefe: boolean;
  isDirector: boolean;
  isAssignedEvaluator: boolean;
  isConsejoMember: boolean;
  totalEvaluatorsCount: number;
  latestAnteproyectoId?: string;
  latestPresentacionId?: string;
}

/**
 * Estrategia de una pestaña de documentos cargados: columnas, filas, botones de cabecera y textos de sus
 * modales.
 */
export interface PreliminaryDraftTabConfiguration {
  tabValue: string;
  columns: Column[];

  enrichEvaluationContext: (baseContext: PreliminaryDraftEvaluationContext) => PreliminaryDraftEvaluationContext;

  getTableData: (documents: FileDocument[], context: PreliminaryDraftEvaluationContext, preliminaryDraftService: PreliminaryDraftService) => (FileDocument & { status: string; allowedActions: string[] })[];

  getHeaderButtons: (context: PreliminaryDraftEvaluationContext, preliminaryDraftService: PreliminaryDraftService) => TableButton[];

  modalConfig: {
    uploadDescription: string;
    uploadedByText: string;
    confirmDescription: string;
    uploadDocumentType: DocumentType;
    emptyMessage: string;
  };
}
