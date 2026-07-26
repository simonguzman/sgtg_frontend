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
  mainDocument: {
    name: string;
    url: string;
    description: string;
  } | null;
}
