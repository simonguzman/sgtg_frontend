import { Column, TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { User } from '../../../../users/interfaces/user.interface';

export interface ThesisEvaluationContext {
  thesisWork:             ThesisWork | null;
  currentUser:            User | null;
  isAdmin:                boolean;
  isStudent:              boolean;
  isDirector:             boolean;
  isDecanatura:           boolean;
  isCodirector:           boolean;
  isAdvisor:              boolean;
  isJuror:                boolean;
  isConsejo:              boolean;
  latestAdvanceId:        string | null;
  isLatestAdvancePending: boolean;
  isArchived?:            boolean;

  requiredEvaluatorsCount?:   number;
  hasFinalDelivery?:          boolean;
  isSuspendedOrCanceled?:     boolean;
  hasCorrespondence?:         boolean;
  hasActiveFinalDelivery?:    boolean;
  hasApprovedPazYSalvo?:      boolean;
  hasSustentationRegistered?: boolean;
  isSustentationEvaluated?:   boolean;
  isSustentationFinalized?:   boolean;

  [key: string]: unknown;
}

/**
 * TRow: tipo de fila que produce getTableData para ESTA pestaña.
 * Por defecto es Record<string, unknown> para que un consumidor que no
 * necesite el tipo exacto pueda seguir usando TabConfiguration sin
 * parámetros.
 *
 * Cada archivo de configuración (AdvancesTabConfig, etc.) declara su
 * propio TRow (AdvanceTableRow, SustentationTableRow, etc.), así que quien
 * importe esa constante directamente (p. ej. un test) recibe el tipo
 * exacto de fila — no un Record<string, unknown> genérico que exigiría
 * volver a castear todo. El único lugar donde se "borra" esta
 * especificidad a propósito es tabStrategies en el componente principal,
 * usando TabConfiguration<any>, porque ahí sí es una colección
 * genuinamente heterogénea.
 */
export interface TabConfiguration<TRow = Record<string, unknown>> {
  tabValue:            string;
  columns:             Column[];
  headerActionRoute?:  string;
  enrichEvaluationContext: (baseContext: ThesisEvaluationContext) => ThesisEvaluationContext;
  getTableData:        (documents: FileDocument[], context: ThesisEvaluationContext) => TRow[];
  getHeaderButtons:    (context: ThesisEvaluationContext) => TableButton[];
  modalConfig: {
    uploadDescription:  string;
    uploadedByText:     string;
    confirmDescription: string;
    uploadDocumentType?: DocumentType;
  };
}
