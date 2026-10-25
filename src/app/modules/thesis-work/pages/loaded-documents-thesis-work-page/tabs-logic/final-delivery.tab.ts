import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { stateList } from '../../../../../core/enums/state.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { TabConfiguration, ThesisEvaluationContext } from './tab-config.interface';
import { FinalDelivery } from '../../../interfaces/final-delivery.interface';
import { formatThesisDate } from '../../../helpers/thesis-date.helper';

interface FinalDeliveryTableRow {
  id: string;
  name: string;
  uploadDate: string;
  status: stateList;
  url: string;
  allowedActions: string[];
}

/** Etapas en las que el director solicita la sustentación. */
const ETAPAS_DE_SOLICITUD = ['EN_CURSO', 'PRORROGA'];

/**
 * Entrega final = solicitud de sustentación del director: monografía, formato
 * E, paz y salvo, concepto del asesor (práctica profesional) y anexos. Si
 * Decanatura no aprueba el paz y salvo, la solicitud queda NO APROBADA y el
 * director radica una nueva.
 */
export const FinalDeliveryTabConfig: TabConfiguration<FinalDeliveryTableRow> = {
  tabValue: 'ENTREGA FINAL',
  headerActionRoute: 'register_final_delivery',
  columns: [
    { field: 'name', header: 'Solicitud', type: 'text', width: '40%' },
    { field: 'uploadDate', header: 'Fecha de solicitud', type: 'text', width: '20%' },
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
    return {
      ...baseContext,
      hasFinalDelivery: (thesis.finalDeliveries?.length ?? 0) > 0,
      requestNotApproved: !!thesis.sustentation?.requestNotApproved,
      isSuspendedOrCanceled: thesis.state === stateList.SUSPENDIDO || thesis.state === stateList.CANCELADO
    };
  },

  getTableData: (_documents: FileDocument[], context: ThesisEvaluationContext): FinalDeliveryTableRow[] =>
    (context.thesisWork?.finalDeliveries ?? []).map((delivery: FinalDelivery): FinalDeliveryTableRow => ({
      id: delivery.id,
      name: 'Solicitud de sustentación (monografía, formato E y paz y salvo)',
      uploadDate: typeof delivery.uploadDate === 'string' ? delivery.uploadDate : formatThesisDate(delivery.uploadDate),
      status: delivery.status,
      url: '',
      allowedActions: ['view-details']
    })),

  getHeaderButtons: (context: ThesisEvaluationContext): TableButton[] => {
    if (context.isArchived || !context.isDirector) return [];
    if (context['requestNotApproved']) {
      return [{ action: 'register_final_delivery', label: 'Solicitar nuevamente la sustentación', variant: 'primary', disabled: false }];
    }
    if (context.hasFinalDelivery) {
      return [{ action: 'register_final_delivery', label: 'Sustentación solicitada', variant: 'primary', disabled: true }];
    }
    const canRequest = ETAPAS_DE_SOLICITUD.includes(context.thesisWork?.stage ?? '');
    return [{
      action: 'register_final_delivery',
      label: canRequest ? 'Solicitar sustentación' : 'No disponible en esta etapa',
      variant: 'primary',
      disabled: !canRequest
    }];
  },

  modalConfig: {
    uploadDescription: '',
    uploadedByText: 'Director del trabajo de grado',
    confirmDescription: '',
    uploadDocumentType: DocumentType.FORMATO_E
  }
};
