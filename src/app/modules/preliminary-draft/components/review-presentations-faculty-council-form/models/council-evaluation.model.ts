import { stateList } from "../../../../../core/enums/state.enum";

export interface CouncilEvaluationFormValues {
  // ← FIX: antes `stateList | string`. Estricto ahora — obliga a mapear
  // explícitamente en vez de forzar con un cast.
  result: stateList;
  comments: string;
  maximumDeliveryDate: Date | null;
  document: File | null;
}

export interface SaveEvaluationPayload {
  formValues: CouncilEvaluationFormValues;
  file: File;
}
