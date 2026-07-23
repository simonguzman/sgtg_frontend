import { Column } from '../../../../../shared/components/table-component/table-component.component';
import { stateList } from '../../../../../core/enums/state.enum';
import { DocumentType } from '../../../../../core/enums/document-type.enum';

export interface DocumentTableRow {
  id: string;
  name: string;
  uploadDate: string | Date;
  status?: stateList;
  type: DocumentType;
  url: string;
  allowedActions: string[];
}

export const DOCUMENTS_COLUMNS: Column[] = [
  { field: 'name',       header: 'Nombre de archivo', type: 'text',  width: '35%' },
  { field: 'uploadDate', header: 'Fecha de carga',    type: 'text',  width: '20%' },
  { field: 'status',     header: 'Estado',            type: 'state', width: '20%' },
  {
    field: 'acciones',
    header: 'Acciones',
    type: 'actions',
    width: '25%',
    actions: [
      { action: 'download', label: 'Descargar propuesta', icon: 'download',   variant: 'primary', disabled: false },
      { action: 'evaluate', label: 'Evaluar propuesta',   icon: 'assignment', variant: 'primary', disabled: false }
    ]
  }
];
