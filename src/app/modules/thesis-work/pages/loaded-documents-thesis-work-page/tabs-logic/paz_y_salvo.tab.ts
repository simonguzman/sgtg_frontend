import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { stateList } from '../../../../../core/enums/state.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { TabConfiguration, ThesisEvaluationContext } from './tab-config.interface';
import { FinalDelivery } from '../../../interfaces/final-delivery.interface';
import { formatThesisDate } from '../../../helpers/thesis-date.helper';

interface PazYSalvoTableRow {
  id: string;
  name: string;
  uploadDate: string;
  status: stateList;
  url: string;
  allowedActions: string[];
}

export const PazYSalvoTabConfig: TabConfiguration<PazYSalvoTableRow> = {
  tabValue: 'PAZ_Y_SALVO',
  headerActionRoute: 'register_paz_y_salvo',
  columns: [
    { field: 'name', header: 'Nombre del Documento', type: 'text', width: '40%' },
    { field: 'uploadDate', header: 'Fecha de Carga', type: 'text', width: '20%' },
    { field: 'status', header: 'Estado', type: 'state', width: '20%' },
    {
      field: 'acciones', header: 'Acciones', type: 'actions', width: '20%',
      actions: [
        { action: 'view-details', label: 'Ver detalles', icon: 'visibility', variant: 'primary', disabled: false },
      ]
    }
  ],

  enrichEvaluationContext: (baseContext: ThesisEvaluationContext): ThesisEvaluationContext => {
    const thesis = baseContext.thesisWork;
    if (!thesis) return baseContext;

    const hasActiveFinalDelivery = thesis.finalDeliveries?.some(
      (delivery: FinalDelivery) => delivery.status !== stateList.NO_APROBADO
    ) ?? false;

    const hasApprovedPazYSalvo = thesis.pazYSalvos?.some(
      (pys) => pys.document.status === stateList.APROBADO
    ) ?? false;

    const isSuspendedOrCanceled = thesis.state === stateList.SUSPENDIDO || thesis.state === stateList.CANCELADO;

    return { ...baseContext, hasActiveFinalDelivery, hasApprovedPazYSalvo, isSuspendedOrCanceled };
  },

  getTableData: (documents: FileDocument[], context: ThesisEvaluationContext): PazYSalvoTableRow[] => {
    const pySDocs = documents.filter(doc => doc.type === DocumentType.PAZ_Y_SALVO);

    return pySDocs.map((doc: FileDocument): PazYSalvoTableRow => {
      const formattedDate = doc.uploadDate
        ? formatThesisDate(typeof doc.uploadDate === 'string' ? new Date(doc.uploadDate) : doc.uploadDate)
        : 'Sin fecha';

      return {
        id: doc.id,
        name: doc.name,
        uploadDate: formattedDate,
        status: doc.status || stateList.EN_REVISION,
        url: doc.url || '',
        allowedActions: ['view-details']
      };
    });
  },

  getHeaderButtons: (context: ThesisEvaluationContext): TableButton[] => {
    if (context.isArchived) return [];
    const buttons: TableButton[] = [];
    const isSuspendedOrCanceled = context.isSuspendedOrCanceled ?? false;

    if (context.isDecanatura || context.isAdmin) {
      const { hasActiveFinalDelivery, hasApprovedPazYSalvo } = context;
      let buttonLabel = 'Registrar Paz y Salvo';
      let buttonDisabled = false;

      if (hasApprovedPazYSalvo) {
        buttonLabel = 'Paz y Salvo Registrado';
        buttonDisabled = true;
      } else if (!hasActiveFinalDelivery) {
        buttonLabel = 'Requiere Entrega Final';
        buttonDisabled = true;
      }

      if (isSuspendedOrCanceled) {
        buttonDisabled = true;
      }

      buttons.push({
        action: 'register_paz_y_salvo',
        label: buttonLabel,
        variant: 'primary',
        disabled: buttonDisabled
      });
    }
    return buttons;
  },

  modalConfig: {
    uploadDescription: '',
    uploadedByText: '',
    confirmDescription: '',
    uploadDocumentType: DocumentType.PAZ_Y_SALVO
  }
};
