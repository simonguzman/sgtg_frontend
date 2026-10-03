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
  title: string;
  description: string;
  modality: string;
  state: string;
  authors: string;
  director: string;
  codirector?: string;
  advisor?: string;
  assignedJurors: string;
  sustentationDate: Date | string | null;
  location: string;
  administrativeStatus: string;
  isAdministrativelyPostponed: boolean;
  isAdministrativelyCanceled: boolean;
  postponementReason: SpecialRequestView | null;
  approvedSpecialRequests: SpecialRequestView[];
  monograph: SustentationDocumentView | null;
  annexes: SustentationDocumentView | null;
  formatEDocument: SustentationDocumentView | null;
  verdicts: JurorVerdictView[];
  showCorrectedDocumentsButton: boolean;
}
