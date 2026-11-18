/**
 * Concepto del Comité que emite el formulario de evaluación: resultado, observaciones y formato A firmado.
 */
export interface SaveProposalEvaluationEvent {
  result: string;
  comments: string;
  file: File;
}
