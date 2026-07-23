import { stateList } from "../../../../../core/enums/state.enum";

export interface CouncilEvaluationFormValues {
  result: stateList | string;
  comments: string;
  maximumDeliveryDate: Date | null;
  document: File | null;
}

export interface SaveEvaluationPayload {
  formValues: CouncilEvaluationFormValues;
  file: File;
}
