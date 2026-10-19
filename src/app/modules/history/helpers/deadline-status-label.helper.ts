import { stateList } from '../../../core/enums/state.enum';
import { EvaluationDeadlineStatus } from '../../../core/enums/evaluation-deadline-status.enum';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';

export interface EvaluatorsDeadlineInput {
  state: stateList;
  evaluationDeadline?: Date | string;
  /** Días hábiles restantes del plazo (negativo si venció), calculados por el backend */
  remainingBusinessDays?: number | null;
  evaluators?: unknown[];
  evaluations?: Evaluation[];
  documentId?: string;
}

/**
 * Texto del plazo a partir de los días hábiles restantes que calcula el
 * backend con el calendario de la universidad (fines de semana, festivos y
 * días no hábiles institucionales).
 *
 * @param remainingDays días hábiles restantes; negativo si el plazo venció
 * @param withoutDeadline texto cuando no hay plazo vigente
 */
export function remainingDaysLabel(remainingDays: number | null | undefined, withoutDeadline = 'Sin límite'): string {
  if (remainingDays === null || remainingDays === undefined) return withoutDeadline;
  if (remainingDays < 0) return `Plazo vencido (${Math.abs(remainingDays)} días hábiles de retraso)`;
  if (remainingDays === 0) return '¡Vence hoy!';
  return `Quedan ${remainingDays} días hábiles`;
}

export function getEvaluatorsDeadlineLabel(input: EvaluatorsDeadlineInput): string {
  const totalEvaluators = input.evaluators?.length ?? 0;
  const relevantEvaluations = input.evaluations?.filter(
    evaluation => input.documentId && evaluation.documentId === input.documentId
  ) ?? [];

  const statusLabel = resolveEvaluationsStatusLabel(relevantEvaluations);

  const isFinalized = [
    stateList.APROBADO,
    stateList.APROBADO_CON_OBSERVACIONES,
    stateList.NO_APROBADO
  ].includes(input.state);

  if (isFinalized) {
    return statusLabel ? `Resolución emitida (${statusLabel})` : 'Resolución emitida';
  }

  if (!input.evaluationDeadline) return 'Sin límite (Consejo)';

  if (totalEvaluators > 0 && relevantEvaluations.length >= totalEvaluators) {
    return `Evaluación completada — ${statusLabel} (Esperando Consejo)`;
  }

  return remainingDaysLabel(input.remainingBusinessDays);
}

function resolveEvaluationsStatusLabel(evaluations: Evaluation[]): string {
  if (evaluations.length === 0) return '';
  const hasDelayed = evaluations.some(e => e.deadlineStatus === EvaluationDeadlineStatus.DELAYED);
  return hasDelayed ? EvaluationDeadlineStatus.DELAYED : EvaluationDeadlineStatus.ON_TIME;
}

/**
 * @param remainingBusinessDays días hábiles restantes del plazo (del backend); null si no hay plazo vigente
 * @param latestEvaluation      la evaluación más reciente (su `deadlineStatus` dice si fue a tiempo)
 */
export function getSingleEvaluationDeadlineLabel(
  state: stateList,
  remainingBusinessDays: number | null | undefined,
  latestEvaluation: Evaluation | undefined
): string {
  const isEvaluated = state === stateList.APROBADO || state === stateList.NO_APROBADO;

  if (isEvaluated) {
    return latestEvaluation?.deadlineStatus
      ? latestEvaluation.deadlineStatus
      : 'Evaluación completada';
  }

  return remainingDaysLabel(remainingBusinessDays);
}
