import { Column, TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { Document, DocumentType } from '../../../../../core/interfaces/Document.interface';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';

export interface PreliminaryDraftEvaluationContext {
  preliminaryDraft: PreliminaryDraft;
  currentUser: any;
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

  getTableData: (documents: Document[], context: PreliminaryDraftEvaluationContext, preliminaryDraftService: any) => Record<string, unknown>[];

  getHeaderButtons: (context: PreliminaryDraftEvaluationContext, preliminaryDraftService: any) => TableButton[];

  modalConfig: {
    uploadDescription: string;
    uploadedByText: string;
    confirmDescription: string;
    uploadDocumentType: DocumentType;
    emptyMessage: string;
  };
}
