import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { stateList } from '../../../../../core/enums/state.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { TabConfiguration, ThesisEvaluationContext } from './tab-config.interface';
import { PazYSalvoRegistry } from '../../../interfaces/paz-y-salvo-registry.interface';
import { formatThesisDate } from '../../../helpers/thesis-date.helper';

interface PazYSalvoTableRow {
  id: string;
  name: string;
  uploadDate: string;
  status: stateList;
  url: string;
  allowedActions: string[];
}

/** Paz y salvo (formato F) que adjunta el director a la solicitud de sustentación; solo consulta. */
export const PazYSalvoTabConfig: TabConfiguration<PazYSalvoTableRow> = {
  tabValue: 'PAZ_Y_SALVO',
  columns: [
    { field: 'name', header: 'Nombre del documento', type: 'text', width: '40%' },
    { field: 'uploadDate', header: 'Fecha de carga', type: 'text', width: '20%' },
    { field: 'status', header: 'Estado', type: 'state', width: '20%' },
    {
      field: 'acciones', header: 'Acciones', type: 'actions', width: '20%',
      actions: [
        { action: 'view-details', label: 'Ver detalles', icon: 'visibility', variant: 'primary', disabled: false },
      ]
    }
  ],

  enrichEvaluationContext: (baseContext: ThesisEvaluationContext): ThesisEvaluationContext => baseContext,

  getTableData: (_documents: FileDocument[], context: ThesisEvaluationContext): PazYSalvoTableRow[] =>
    (context.thesisWork?.pazYSalvos ?? []).map((registro: PazYSalvoRegistry): PazYSalvoTableRow => ({
      id: registro.document.id,
      name: `Paz y salvo (formato F) - ${registro.document.name}`,
      uploadDate: formatThesisDate(new Date(registro.registrationDate)),
      status: registro.document.status ?? stateList.APROBADO,
      url: registro.document.url,
      allowedActions: ['view-details']
    })),

  getHeaderButtons: (): TableButton[] => [],

  modalConfig: {
    uploadDescription: '',
    uploadedByText: 'Director del trabajo de grado',
    confirmDescription: '',
    uploadDocumentType: undefined
  }
};
