import { stateList } from '../../../core/enums/state.enum';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';

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

/**
 * @param remainingBusinessDays días hábiles restantes del plazo (del backend); null si no hay plazo vigente
 * @param latestEvaluation      la evaluación más reciente (su `deadlineStatus` dice si fue a tiempo)
 */
export function getSingleEvaluationDeadlineLabel(
  state: stateList,
  remainingBusinessDays: number | null | undefined,
  latestEvaluation: Evaluation | undefined
): string {
  const isEvaluated = [stateList.APROBADO, stateList.NO_APROBADO, stateList.PERTINENTE, stateList.NO_PERTINENTE]
    .includes(state);

  if (isEvaluated) {
    return latestEvaluation?.deadlineStatus
      ? latestEvaluation.deadlineStatus
      : 'Evaluación completada';
  }

  return remainingDaysLabel(remainingBusinessDays);
}
