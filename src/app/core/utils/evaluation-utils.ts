import { Evaluation } from '../interfaces/evaluation.interface';
import { FormattedDocument } from '../interfaces/formatted-document.interface';
import { stateList } from '../enums/state.enum';

/** Formato A firmado del concepto pertinente del Comité de Programa (el más reciente), null si no hay. */
export function resolveApprovedEvaluationDocument(
  evaluations: Evaluation[] | undefined
): FormattedDocument | null {
  if (!evaluations?.length) return null;
  const approvedEvaluation = [...evaluations]
    .reverse()
    .find(evaluation => evaluation.veredict === stateList.PERTINENTE);
  return approvedEvaluation?.signedDocuments?.[0] ?? null;
}
