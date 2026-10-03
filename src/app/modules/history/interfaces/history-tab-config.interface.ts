import { Column } from '../../../shared/components/table-component/table-component.component';
import { HistoryEvaluationContext } from './history-evaluation-context.interface';

export interface HistoryTabConfiguration {
  readonly tabValue: string;
  readonly columns: Column[];
  getTableData(context: HistoryEvaluationContext): Record<string, unknown>[];
}
