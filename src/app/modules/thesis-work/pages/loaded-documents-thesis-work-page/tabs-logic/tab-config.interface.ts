import { Column, TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { Document, DocumentType } from '../../../../../core/interfaces/Document.interface';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { User } from '../../../../users/interfaces/user.interface';

export interface ThesisEvaluationContext {
  thesisWork: ThesisWork | null;
  currentUser: User | null;
  isAdmin: boolean;
  isStudent: boolean;
  isDirector: boolean;
  isDecanatura: boolean;
  isCodirector: boolean;
  isAdvisor: boolean;
  isJuror: boolean;
  isConsejo: boolean;
  latestAdvanceId: string | null;
  isLatestAdvancePending: boolean;
  [key: string]: unknown;
}

export interface TabConfiguration {
  tabValue: string;
  columns: Column[];
  headerActionRoute?: string;

  enrichEvaluationContext: (baseContext: ThesisEvaluationContext) => ThesisEvaluationContext;

  getTableData: (documents: Document[], context: ThesisEvaluationContext) => Record<string, unknown>[];

  getHeaderButtons: (context: ThesisEvaluationContext) => TableButton[];

  modalConfig: {
    uploadDescription: string;
    uploadedByText: string;
    confirmDescription: string;
    uploadDocumentType: DocumentType;
  };
}
