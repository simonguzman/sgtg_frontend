/** Datos para radicar un informe mensual: el PDF (formato D) y observaciones opcionales. */
export interface UploadAdvancePayload {
  comments: string;
  file: File;
}

/** Revisión de un informe mensual: observaciones y/o PDF de notas (al menos uno). */
export interface SubmitAdvanceEvaluationPayload {
  comments: string;
  notes: File | null;
}
