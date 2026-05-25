// tab-config.interface.ts
import { Column, TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { Document, DocumentType } from '../../../../../core/interfaces/Document.interface';
// Asegúrate de ajustar estas rutas a la ubicación real de tus modelos
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
  // Usamos 'unknown' en lugar de 'any' para forzar la aserción de tipos
  // cuando se consuman propiedades dinámicas en el futuro.
  [key: string]: unknown;
}

export interface TabConfiguration {
  tabValue: string;
  columns: Column[];

  // 📐 Cada pestaña procesa y enriquece el contexto con sus propias reglas de negocio
  enrichEvaluationContext: (baseContext: ThesisEvaluationContext) => ThesisEvaluationContext;

  // 'Record<string, unknown>[]' nos asegura que retornamos un arreglo de objetos,
  // evitando el uso de 'any[]' que apagaría el linter en la tabla.
  getTableData: (documents: Document[], context: ThesisEvaluationContext) => Record<string, unknown>[];

  getHeaderButtons: (context: ThesisEvaluationContext) => TableButton[];

  modalConfig: {
    uploadDescription: string;
    uploadedByText: string;
    confirmDescription: string;
    uploadDocumentType: DocumentType;
  };
}
