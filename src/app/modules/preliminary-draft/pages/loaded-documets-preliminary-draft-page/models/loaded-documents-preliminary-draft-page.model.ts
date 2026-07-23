import { TabItem } from "../../../../../shared/components/tabs/tabs.component";

export interface UploadContext {
  fileName: string;
  file: File;
}

export const LOADED_DOCUMENTS_TABS: TabItem[] = [
  { label: 'Anteproyectos', value: 'ANTEPROYECTOS' },
  { label: 'Presentaciones al consejo de facultad', value: 'PRESENTACIONES' }
];

export enum LoadedDocumentsTabType {
  ANTEPROYECTOS = 'ANTEPROYECTOS',
  PRESENTACIONES = 'PRESENTACIONES'
}
