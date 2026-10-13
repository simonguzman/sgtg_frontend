/** Fecha clave del trabajo calculada por el backend. */
export interface ThesisWorkDeadlineItem {
  label: string;
  date: Date;
  hint?: string;
}

export interface ThesisWorkDetailsView {
  id: string;
  title: string;
  description: string;
  modality: string;
  state: string;
  participants: {
    authors: string;
    director: string;
    codirector?: string;
    advisor?: string;
  };
  /** Fechas del trabajo en curso (las que aplican en su etapa) */
  deadlines: ThesisWorkDeadlineItem[];
  mainDocument: {
    name: string;
    url: string;
    description: string;
  } | null;
}
