import { TabItem } from "../../../../../shared/components/tabs/tabs.component";

/** Archivo elegido para cargar. */
export interface UploadContext {
  fileName: string;
  file: File;
}

/** Pestañas de los documentos cargados del anteproyecto. */
export const LOADED_DOCUMENTS_TABS: TabItem[] = [
  { label: 'Anteproyectos', value: 'ANTEPROYECTOS' },
  { label: 'Presentaciones al consejo de facultad', value: 'PRESENTACIONES' }
];

/** Valores de las pestañas de los documentos cargados. */
export enum LoadedDocumentsTabType {
  ANTEPROYECTOS = 'ANTEPROYECTOS',
  PRESENTACIONES = 'PRESENTACIONES'
}
