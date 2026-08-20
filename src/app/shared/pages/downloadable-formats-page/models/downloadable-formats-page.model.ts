import { TabItem } from '../../../components/tabs/tabs.component';
import { Column } from '../../../components/table-component/table-component.component';

export interface DownloadableFormat {
  id: string;
  title: string;
  url: string;
}

export const DOWNLOADABLE_FORMATS_TABS: TabItem[] = [
  { label: 'Trabajo de investigación', value: 'TI' },
  { label: 'Práctica profesional',     value: 'PP' }
];

export const DOWNLOADABLE_FORMATS_COLUMNS: Column[] = [
  { field: 'title',    header: 'Título', type: 'text',    width: '80%' },
  {
    field: 'acciones', header: '', type: 'actions', width: '20%',
    actions: [{ action: 'descargar', label: 'Descargar formato', variant: 'primary', disabled: false }]
  }
];

// Claves alineadas con los `value` de DOWNLOADABLE_FORMATS_TABS ('TI'/'PP').
// Se mantiene como Record<string, ...> — no como union literal estricto —
// por el mismo motivo que el resto de páginas con <app-tabs> del proyecto:
// (tabChange) emite un string genérico, así que activeTab también se tipa
// como string; un Record<'TI'|'PP', ...> exigiría indexarlo con ese mismo
// literal, rompiendo `activeTab.set($event)` en el template.
export const DOWNLOADABLE_FORMATS_BY_CATEGORY: Record<string, DownloadableFormat[]> = {
  TI: [
    { id: 'ti-a', title: 'FORMATO TI-A: ...', url: 'assets/formatos/TI-A.pdf' },
    { id: 'ti-b', title: 'FORMATO TI-B: ...', url: 'assets/formatos/TI-B.pdf' },
    { id: 'ti-c', title: 'FORMATO TI-C: ...', url: 'assets/formatos/TI-C.pdf' },
    { id: 'ti-e', title: 'FORMATO TI-E: ...', url: 'assets/formatos/TI-E.pdf' },
    { id: 'ti-f', title: 'FORMATO TI-F: ...', url: 'assets/formatos/TI-F.pdf' },
    { id: 'ti-g', title: 'FORMATO TI-G: ...', url: 'assets/formatos/TI-G.pdf' },
    { id: 'ti-h', title: 'FORMATO TI-H: ...', url: 'assets/formatos/TI-H.pdf' }
  ],
  PP: [
    { id: 'pp-a', title: 'FORMATO PP-A: ...', url: 'assets/formatos/PP-A.pdf' },
    { id: 'pp-b', title: 'FORMATO PP-B: ...', url: 'assets/formatos/PP-B.pdf' },
    { id: 'pp-c', title: 'FORMATO PP-C: ...', url: 'assets/formatos/PP-C.pdf' },
    { id: 'pp-d', title: 'FORMATO PP-D: ...', url: 'assets/formatos/PP-D.pdf' },
    { id: 'pp-e', title: 'FORMATO PP-E: ...', url: 'assets/formatos/PP-E.pdf' },
    { id: 'pp-f', title: 'FORMATO PP-F: ...', url: 'assets/formatos/PP-F.pdf' },
    { id: 'pp-g', title: 'FORMATO PP-G: ...', url: 'assets/formatos/PP-G.pdf' },
    { id: 'pp-h', title: 'FORMATO PP-H: ...', url: 'assets/formatos/PP-H.pdf' }
  ]
};
