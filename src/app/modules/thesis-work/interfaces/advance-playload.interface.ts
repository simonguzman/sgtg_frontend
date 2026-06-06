export enum AdvanceEvaluationResult {
  EVALUADO = 'Evaluado',
  EN_REVISION = 'En revisión'
}

export interface AdvanceBaseData {
  title: string;
  comments: string;
}

export interface UploadAdvanceFormValues extends AdvanceBaseData {}

export interface UploadAdvancePayload {
  formValues: UploadAdvanceFormValues;
  files: File[];
}

export interface CreateAdvanceRequest extends AdvanceBaseData {
  studentId: string;
  advanceId: string;
}
// Para la evaluación de un avance
export interface EvaluateAdvanceFormValues {
  result: AdvanceEvaluationResult; // 'Evaluado' | 'En revisión'
  comments: string;
}

export interface SubmitAdvanceEvaluationPayload {
  formValues: EvaluateAdvanceFormValues;
  files?: File[];
}


