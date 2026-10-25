/** Dato de la página de detalle con su etiqueta (ej. participante). */
export interface WorkDetailsItem {
  label: string;
  value: string;
}

/** Fecha clave de la etapa; `hint` aclara de dónde sale. */
export interface WorkDetailsDate {
  label: string;
  date: Date;
  hint?: string;
}

/** Documento descargable de la etapa. */
export interface WorkDetailsDocument {
  name: string;
  description: string;
  url: string;
}

/** Contenido registrado en la propuesta; los opcionales vacíos quedan sin valor. */
export interface ProposalContent {
  generalObjective?: string;
  specificObjectives: string[];
  description?: string;
  lineOfResearch?: string;
  organization?: string;
}

/**
 * Información de una página de detalle (propuesta, anteproyecto o trabajo de
 * grado). Los campos opcionales que no se registraron quedan vacíos y no se
 * muestran.
 */
export interface WorkDetailsView {
  heading: string;
  title: string;
  generalObjective?: string;
  specificObjectives: string[];
  description?: string;
  lineOfResearch?: string;
  modality: string;
  state: string;
  participants: WorkDetailsItem[];
  dates: WorkDetailsDate[];
  documents: WorkDetailsDocument[];
}
