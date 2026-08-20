import { ProjectStage } from '../enum/projectStage.enum';
import { EvaluationDeadlineStatus } from '../../../core/enums/evaluation-deadline-status.enum';

export type DeadlineFilterValue = 'ALL' | EvaluationDeadlineStatus | 'NOT_EVALUATED';

export interface StatisticsFilters {
  stage: ProjectStage | null;
  period: string | null;
  directorId: string | null;
  archiveStatus: 'ACTIVE' | 'ARCHIVED' | 'ALL';
  deadlineFilter: DeadlineFilterValue; // ← NUEVO
}

export const DEADLINE_FILTER_OPTIONS: { label: string; value: DeadlineFilterValue }[] = [
  { label: 'Todos los plazos', value: 'ALL' },
  { label: 'Evaluado en plazo', value: EvaluationDeadlineStatus.ON_TIME },
  { label: 'Evaluado con retraso', value: EvaluationDeadlineStatus.DELAYED },
  { label: 'Sin evaluar', value: 'NOT_EVALUATED' }
];
