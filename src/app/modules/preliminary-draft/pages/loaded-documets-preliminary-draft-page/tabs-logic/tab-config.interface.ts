import { Column, TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';

// Tipamos estrictamente el usuario para evitar el 'any'
export interface TabCurrentUser {
  id: string;
  firstName: string;
  lastName: string;
  roles?: string[];
}

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

export interface PreliminaryDraftTabConfiguration {
  tabValue: string;
  columns: Column[];

  enrichEvaluationContext: (baseContext: PreliminaryDraftEvaluationContext) => PreliminaryDraftEvaluationContext;

  // Reemplazamos 'any' por 'PreliminaryDraftService' y tipamos el retorno
  getTableData: (documents: FileDocument[], context: PreliminaryDraftEvaluationContext, preliminaryDraftService: PreliminaryDraftService) => (FileDocument & { status: string; allowedActions: string[] })[];

  // Reemplazamos 'any' por 'PreliminaryDraftService'
  getHeaderButtons: (context: PreliminaryDraftEvaluationContext, preliminaryDraftService: PreliminaryDraftService) => TableButton[];

  modalConfig: {
    uploadDescription: string;
    uploadedByText: string;
    confirmDescription: string;
    uploadDocumentType: DocumentType;
    emptyMessage: string;
  };
}
