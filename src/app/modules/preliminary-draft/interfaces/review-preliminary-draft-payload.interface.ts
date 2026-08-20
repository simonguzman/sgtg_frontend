import { stateList } from "../../../core/enums/state.enum";

/**
 * Forma de los datos que ReviewPreliminaryDraftFormComponent emite al
 * confirmar una evaluación de anteproyecto. Vive junto a PreliminaryDraft
 * (no dentro de components/review-preliminary-draft-form/ ni de
 * pages/review-preliminary-draft-page/) porque tanto el componente de
 * formulario como el facade de página lo necesitan — mismo criterio ya
 * aplicado con SaveProposalEvaluationEvent en el módulo de Propuestas.
 */
export interface ReviewEvaluationFormValues {
  result: stateList;
  comments: string;
}

export interface PendingReviewData {
  formValues: ReviewEvaluationFormValues;
  file: File;
  annotatedFile?: File;
}
