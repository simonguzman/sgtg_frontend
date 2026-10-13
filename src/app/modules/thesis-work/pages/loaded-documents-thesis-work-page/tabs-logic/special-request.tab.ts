import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { ThesisEvaluationContext, TabConfiguration } from './tab-config.interface';
import { SpecialRequest } from '../../../interfaces/special-request.interface';
import { SpecialRequestType } from '../../../enums/special-request-type.enum';
import { stateList } from '../../../../../core/enums/state.enum';
import { availableRequestTypes } from '../../../helpers/special-request-availability.helper';

interface SpecialRequestTableRow {
  id: string;
  type: string;
  description: string;
  date: string;
  status: stateList;
  allowedActions: string[];
}

/**
 * Solicitudes del director (cambio de título y objetivos, prórroga,
 * suspensión, reanudación, cancelación). El Consejo decide las pendientes con
 * una resolución; la reanudación solo se registra.
 */
export const SpecialRequestTabConfig: TabConfiguration<SpecialRequestTableRow> = {
  tabValue: 'SOLICITUDES',
  headerActionRoute: 'register_special_request',
  columns: [
    { field: 'type', header: 'Solicitud', type: 'text', width: '20%' },
    { field: 'description', header: 'Descripción', type: 'text', width: '30%' },
    { field: 'date', header: 'Fecha de registro', type: 'text', width: '15%' },
    { field: 'status', header: 'Estado', type: 'state', width: '15%' },
    {
      field: 'acciones', header: 'Acciones', type: 'actions', width: '20%',
      actions: [
        { action: 'view-details', label: 'Ver detalles', icon: 'visibility', variant: 'primary', disabled: false },
        { action: 'evaluate_special_request', label: 'Evaluar solicitud', icon: 'gavel', variant: 'primary', disabled: false }
      ]
    }
  ],

  enrichEvaluationContext: (baseContext: ThesisEvaluationContext): ThesisEvaluationContext => {
    const thesis = baseContext.thesisWork;
    if (!thesis) return baseContext;
    return { ...baseContext, availableRequestTypes: availableRequestTypes(thesis) };
  },

  getTableData: (_documents: FileDocument[], context: ThesisEvaluationContext): SpecialRequestTableRow[] => {
    const thesis = context.thesisWork;
    if (!thesis?.specialRequests) return [];

    const isArchived = context.isArchived ?? false;

    return thesis.specialRequests.map((request: SpecialRequest): SpecialRequestTableRow => {
      const allowedActions: string[] = ['view-details'];
      if (!isArchived && context.isConsejo && request.status === stateList.EN_REVISION
        && request.requestType !== SpecialRequestType.REANUDACION) {
        allowedActions.push('evaluate_special_request');
      }

      return {
        id: request.id,
        type: request.requestType,
        description: request.description,
        date: request.requestDate ? new Date(request.requestDate).toLocaleDateString('es-ES') : 'Sin fecha',
        status: request.status,
        allowedActions
      };
    });
  },

  getHeaderButtons: (context: ThesisEvaluationContext): TableButton[] => {
    if (context.isArchived || !context.isDirector) return [];
    const available = (context['availableRequestTypes'] as SpecialRequestType[] | undefined) ?? [];
    return [{
      action: 'register_special_request',
      label: available.length > 0 ? 'Registrar solicitud' : 'Sin solicitudes disponibles',
      variant: 'primary',
      disabled: available.length === 0
    }];
  },

  modalConfig: {
    uploadDescription: '',
    uploadedByText: '',
    confirmDescription: '',
    uploadDocumentType: undefined
  }
};
