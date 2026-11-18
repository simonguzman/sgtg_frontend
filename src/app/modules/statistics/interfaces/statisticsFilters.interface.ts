import { ProjectStage } from '../enum/projectStage.enum';
import { EvaluationDeadlineStatus } from '../../../core/enums/evaluation-deadline-status.enum';

/** Filtro del plazo: todos, evaluados en plazo, con retraso o sin evaluar. */
export type DeadlineFilterValue = 'ALL' | EvaluationDeadlineStatus | 'NOT_EVALUATED';

/** Filtros de la página de estadísticas; null es sin filtro. */
export interface StatisticsFilters {
  stage: ProjectStage | null;
  period: string | null;
  directorId: string | null;
  modality: string | null;
  program: string | null;
  archiveStatus: 'ACTIVE' | 'ARCHIVED' | 'ALL';
  deadlineFilter: DeadlineFilterValue;
}

/** Sin filtros: todos los trabajos, en proceso y cerrados */
export const DEFAULT_STATISTICS_FILTERS: StatisticsFilters = {
  stage: null,
  period: null,
  directorId: null,
  modality: null,
  program: null,
  archiveStatus: 'ALL',
  deadlineFilter: 'ALL'
};

/** Opciones del filtro del plazo. */
export const DEADLINE_FILTER_OPTIONS: { label: string; value: DeadlineFilterValue }[] = [
  { label: 'Todos los plazos', value: 'ALL' },
  { label: 'Evaluado en plazo', value: EvaluationDeadlineStatus.ON_TIME },
  { label: 'Evaluado con retraso', value: EvaluationDeadlineStatus.DELAYED },
  { label: 'Sin evaluar', value: 'NOT_EVALUATED' }
];
