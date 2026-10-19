import { stateList } from "../../../../../core/enums/state.enum";

export interface CouncilEvaluationFormValues {
  result: stateList;
  comments: string;
  /** Plazo de ejecución que fija el Consejo al aprobar (meses desde hoy) */
  executionMonths: number | null;
  document: File | null;
}

export interface SaveEvaluationPayload {
  formValues: CouncilEvaluationFormValues;
  file: File;
}
