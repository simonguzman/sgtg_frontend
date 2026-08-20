import { stateList } from '../../../core/enums/state.enum';
import { EvaluationDeadlineStatus } from '../../../core/enums/evaluation-deadline-status.enum';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { getRemainingBusinessDays } from '../../../core/utils/date-utils';

/**
 * Centraliza el cálculo de "¿se evaluó en plazo o con retraso?" que
 * PreliminaryDraftMapperService y ProposalMapperService ya calculaban
 * correctamente para sus propias tablas activas. El Historial mostraba
 * el texto estático 'Finalizado' en su lugar — este helper es la misma
 * lógica extraída para que ambos módulos (activo + historial) la
 * compartan sin duplicarla por tercera vez.
 */

export interface EvaluatorsDeadlineInput {
  state: stateList;
  evaluationDeadline?: Date | string;
  evaluators?: unknown[];
  evaluations?: Evaluation[];
  documentId?: string;
}

/**
 * Caso "evaluadores múltiples con documentId" — usado por Anteproyecto y,
 * bajo el mismo patrón, por la etapa de evaluación de Trabajo de Grado
 * (evaluators[] + evaluations[] filtradas por documentId).
 */
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

/**
 * Caso "un solo veredicto reciente con su propio deadlineStatus" — usado
 * por Propuesta, donde evaluations[0] ya trae el resultado consolidado
 * del comité, sin necesidad de contar evaluadores por separado.
 */
export function getSingleEvaluationDeadlineLabel(
  state: stateList,
  evaluationDeadline: Date | string | undefined,
  latestEvaluation: Evaluation | undefined
): string {
  const isEvaluated = state === stateList.APROBADO || state === stateList.NO_APROBADO;

  if (isEvaluated) {
    return latestEvaluation?.deadlineStatus
      ? (latestEvaluation.deadlineStatus as string)
      : 'Evaluación completada';
  }

  if (!evaluationDeadline) return 'Sin límite';

  const remainingDays = getRemainingBusinessDays(evaluationDeadline);
  if (remainingDays < 0) return `Plazo vencido (${Math.abs(remainingDays)} días hábiles de retraso)`;
  if (remainingDays === 0) return '¡Vence hoy!';
  return `Quedan ${remainingDays} días hábiles`;
}
