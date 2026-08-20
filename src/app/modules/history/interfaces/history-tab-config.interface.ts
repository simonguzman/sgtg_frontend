import { Column } from '../../../shared/components/table-component/table-component.component';
import { HistoryEvaluationContext } from './history-evaluation-context.interface';

// ← getTableData pasa de propiedad-función a método de interfaz — más
// idiomático para que lo implemente una clase (ArchivedProposalsTabService,
// etc.) en vez de un objeto literal con propiedades de tipo función.
export interface HistoryTabConfiguration {
  readonly tabValue: string;
  readonly columns: Column[];
  getTableData(context: HistoryEvaluationContext): Record<string, unknown>[];
}
