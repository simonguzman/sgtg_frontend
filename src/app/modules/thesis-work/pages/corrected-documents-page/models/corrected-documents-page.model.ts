import { Column } from '../../../../../shared/components/table-component/table-component.component';
import { CorrectedDelivery } from '../../../interfaces/corrected-delivery.interface';
import { stateList } from '../../../../../core/enums/state.enum';

export interface CorrectedDeliveryTableRow {
  id: string;
  name: string;
  date: string | Date;
  status: stateList;
  allowedActions: string[];
  rawDelivery: CorrectedDelivery;
}

export const CORRECTED_DOCUMENTS_COLUMNS: Column[] = [
  { field: 'name',   header: 'Nombre de la Entrega', type: 'text',  width: '40%' },
  { field: 'date',   header: 'Fecha de Carga',       type: 'text',  width: '20%' },
  { field: 'status', header: 'Estado',               type: 'state', width: '20%' },
  {
    field: 'acciones',
    header: 'Acciones',
    type: 'actions',
    width: '20%',
    actions: [
      { action: 'view-details', label: 'Ver Detalles', icon: 'visibility', variant: 'primary', disabled: false }
    ]
  }
];
