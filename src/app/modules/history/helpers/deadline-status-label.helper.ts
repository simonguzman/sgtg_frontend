import { stateList } from '../../../core/enums/state.enum';
import { EvaluationDeadlineStatus } from '../../../core/enums/evaluation-deadline-status.enum';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { getRemainingBusinessDays } from '../../../core/utils/date-utils';

export interface EvaluatorsDeadlineInput {
  state: stateList;
  evaluationDeadline?: Date | string;
  evaluators?: unknown[];
  evaluations?: Evaluation[];
  documentId?: string;
}

export function getEvaluatorsDeadlineLabel(input: EvaluatorsDeadlineInput): string {
  const totalEvaluators = input.evaluators?.length ?? 0;
  const relevantEvaluations = input.evaluations?.filter(
    e => input.documentId && e.documentId === input.documentId
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

  const remainingDays = getRemainingBusinessDays(new Date(input.evaluationDeadline));
  if (remainingDays < 0) return `Plazo vencido (${Math.abs(remainingDays)} días hábiles de retraso)`;
  if (remainingDays === 0) return '¡Vence hoy!';
  return `Quedan ${remainingDays} días hábiles`;
}

function resolveEvaluationsStatusLabel(evaluations: Evaluation[]): string {
  if (evaluations.length === 0) return '';
  const hasDelayed = evaluations.some(e => e.deadlineStatus === EvaluationDeadlineStatus.DELAYED);
  return hasDelayed ? EvaluationDeadlineStatus.DELAYED : EvaluationDeadlineStatus.ON_TIME;
}

export function getSingleEvaluationDeadlineLabel(
  state: stateList,
  evaluationDeadline: Date | string | undefined,
  latestEvaluation: Evaluation | undefined
): string {
  const isEvaluated = state === stateList.APROBADO || state === stateList.NO_APROBADO;

  if (isEvaluated) {
    // FIX: Eliminado el casteo redundante 'as string'
    return latestEvaluation?.deadlineStatus
      ? latestEvaluation.deadlineStatus
      : 'Evaluación completada';
  }

  if (!evaluationDeadline) return 'Sin límite';

  const remainingDays = getRemainingBusinessDays(new Date(evaluationDeadline));
  if (remainingDays < 0) return `Plazo vencido (${Math.abs(remainingDays)} días hábiles de retraso)`;
  if (remainingDays === 0) return '¡Vence hoy!';
  return `Quedan ${remainingDays} días hábiles`;
}
