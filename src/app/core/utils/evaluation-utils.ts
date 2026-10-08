import { Evaluation } from '../interfaces/evaluation.interface';
import { FormattedDocument } from '../interfaces/formatted-document.interface';
import { stateList } from '../enums/state.enum';

export function resolveApprovedEvaluationDocument(
  evaluations: Evaluation[] | undefined
): FormattedDocument | null {
  if (!evaluations?.length) return null;
  const approvedEvaluation = [...evaluations]
    .reverse()
    .find(evaluation => evaluation.veredict === stateList.APROBADO);
  return approvedEvaluation?.signedDocuments?.[0] ?? null;
}
