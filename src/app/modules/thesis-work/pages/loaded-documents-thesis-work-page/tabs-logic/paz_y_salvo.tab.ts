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
  observations: string;
  url: string;
  allowedActions: string[];
}

/**
 * Paz y salvo (formato F): Decanatura lo revisa después de la solicitud de
 * sustentación (lo aprueba o no, siempre con el documento). Los demás consultan.
 */
export const PazYSalvoTabConfig: TabConfiguration<PazYSalvoTableRow> = {
  tabValue: 'PAZ_Y_SALVO',
  headerActionRoute: 'review_paz_y_salvo',
  columns: [
    { field: 'name', header: 'Nombre del documento', type: 'text', width: '30%' },
    { field: 'uploadDate', header: 'Fecha de carga', type: 'text', width: '15%' },
    { field: 'status', header: 'Estado', type: 'state', width: '15%' },
    { field: 'observations', header: 'Observaciones', type: 'text', width: '20%' },
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
      observations: registro.academicComments ?? '',
      url: registro.document.url,
      allowedActions: ['view-details']
    })),

  getHeaderButtons: (context: ThesisEvaluationContext): TableButton[] => {
    if (context.isArchived || !context.isDecanatura) return [];
    const sustentation = context.thesisWork?.sustentation;
    let label = 'Esperando la solicitud de sustentación';
    let disabled = true;
    if (sustentation?.pazYSalvoApproved) {
      label = 'Paz y salvo aprobado';
    } else if (sustentation?.state === 'SOLICITADA') {
      label = 'Revisar paz y salvo';
      disabled = false;
    }
    return [{ action: 'review_paz_y_salvo', label, variant: 'primary', disabled }];
  },

  modalConfig: {
    uploadDescription: '',
    uploadedByText: 'Decanatura',
    confirmDescription: '',
    uploadDocumentType: undefined
  }
};
