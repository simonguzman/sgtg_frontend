import { stateList } from "../enums/state.enum";

export enum DocumentType{
  'PROPUESTA' = 'Propuesta',
  'ANTEPROYECTO' = 'Anteproyecto',
  'MONOGRAFIA' = 'Monografia',
  'ANEXOS' = 'Anexos',
  'AVANCE' = 'Avance',
  'CORRECCION' = 'Correccion',
  'FORMATO' = 'Formato',
  'FORMATO_E' = 'Formato_E',
  'FORMATO_G' = 'Formato_G',
  'FORMATO_H' = 'Formato_H',
  'PAZ_Y_SALVO' = 'Paz_y_salvo',
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
