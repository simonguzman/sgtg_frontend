/**
 * Forma del evento que EvaluationProposalFormComponent emite al confirmar
 * una evaluación de propuesta. Vive junto a Proposal (no dentro de
 * pages/evaluation-proposal-page/ ni de components/evaluation-proposal-form/)
 * porque tanto el componente de formulario como el facade de página
 * necesitan importarlo.
 */
export interface SaveProposalEvaluationEvent {
  result: string;
  comments: string;
  file: File;
}
