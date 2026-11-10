import { stateList } from "../../../../../core/enums/state.enum";

export interface CouncilEvaluationFormValues {
  result: stateList;
  comments: string;
  /** Al aprobar: fecha de la reunión del Consejo (inicio del plazo) */
  startDate: Date | null;
  /** Al aprobar: fecha máxima de entrega (entre 3 y 9 meses después del inicio) */
  endDate: Date | null;
  document: File | null;
}

export interface SaveEvaluationPayload {
  formValues: CouncilEvaluationFormValues;
  file: File;
}
