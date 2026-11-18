import { stateList } from "../../../core/enums/state.enum";

/** Concepto del evaluador sobre el anteproyecto y sus observaciones. */
export interface ReviewEvaluationFormValues {
  result: stateList;
  comments: string;
}

/**
 * Concepto que emite el formulario de evaluación, con el formato B firmado y, si se adjuntó, el documento con
 * las anotaciones.
 */
export interface PendingReviewData {
  formValues: ReviewEvaluationFormValues;
  file: File;
  annotatedFile?: File;
}
