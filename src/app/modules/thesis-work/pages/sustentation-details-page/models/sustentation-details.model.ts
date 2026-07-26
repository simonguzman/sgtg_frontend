export interface SustentationDocumentView {
  name: string;
  url: string;
  description: string;
}

export interface JurorVerdictView {
  jurorName: string;
  evaluationDate: Date | string;
  verdict: string;
  observations: string;
  attachedDocument: SustentationDocumentView | null;
  statusColorClass: string;
}

export interface SpecialRequestView {
  type: string;
  description: string;
  resolutionDetails?: string;
}

export interface SustentationDetailsView {
  // Información General
  title: string;
  description: string;
  modality: string;
  state: string;
  authors: string;

  // Participantes
  director: string;
  codirector?: string;
  advisor?: string;
  assignedJurors: string;

  // Programación
  sustentationDate: Date | string | null;
  location: string;

  // Estado Administrativo
  administrativeStatus: string;
  isAdministrativelyPostponed: boolean;
  isAdministrativelyCanceled: boolean;
  postponementReason: SpecialRequestView | null;
  approvedSpecialRequests: SpecialRequestView[];

  // Archivos Adjuntos
  monograph: SustentationDocumentView | null;
  annexes: SustentationDocumentView | null;
  formatEDocument: SustentationDocumentView | null;

  // Veredictos y Botones
  verdicts: JurorVerdictView[];
  showCorrectedDocumentsButton: boolean;
}
