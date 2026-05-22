import { stateList } from "../enums/state.enum";

export enum DocumentType{
  'PROPUESTA' = 'Propuesta',
  'ANTEPROYECTO' = 'Anteproyecto',
  'MONONGRAFIA' = 'Monografia',
  'ANEXO' = 'Anexo',
  'AVANCE' = 'Avance',
  'CORRECCION' = 'Correccion',
  'FORMATO' = 'Formato',
  'FORMATO E' = 'Formato E',
  'FORMATO G' = 'Formato G',
  'FORMATO H' = 'Formato H',
  'PAZ Y SALVO' = 'Paz y salvo',
  'RESOLUCION' = 'Resolucion'
}

export interface Document {
  id: string;
  name: string;
  url: string;
  uploadDate: string | Date;
  type: DocumentType
  status?: stateList;
}
