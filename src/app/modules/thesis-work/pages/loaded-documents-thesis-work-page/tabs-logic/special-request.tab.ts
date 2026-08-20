import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { ThesisEvaluationContext, TabConfiguration } from './tab-config.interface';
import { SpecialRequest } from '../../../interfaces/special-request.interface';
import { JurorVerdict } from '../../../interfaces/juror-verdict.interface';
import { stateList } from '../../../../../core/enums/state.enum';

interface SpecialRequestTableRow {
  id: string;
  description: string;
  date: string;
  status: stateList;
  allowedActions: string[];
}

export const SpecialRequestTabConfig: TabConfiguration<SpecialRequestTableRow> = {
  tabValue: 'SOLICITUDES',
  headerActionRoute: 'register_special_request',
  columns: [
    { field: 'description', header: 'Descripción de la Solicitud', type: 'text', width: '35%' },
    { field: 'date', header: 'Fecha de Registro', type: 'text', width: '20%' },
    { field: 'status', header: 'Estado', type: 'state', width: '20%' },
    {
      field: 'acciones', header: 'Acciones', type: 'actions', width: '25%',
      actions: [
        { action: 'view-details', label: 'Ver detalles', icon: 'visibility', variant: 'primary', disabled: false },
        { action: 'evaluate_special_request', label: 'Evaluar Solicitud', icon: 'gavel', variant: 'primary', disabled: false }
      ]
    }
  ],

  enrichEvaluationContext: (baseContext: ThesisEvaluationContext): ThesisEvaluationContext => {
    const thesis = baseContext.thesisWork;
    if (!thesis) return baseContext;

    const verdictsList: JurorVerdict[] = thesis.sustentations?.[0]?.verdicts || [];
    const isSustentationEvaluated = verdictsList.length > 0;
    const lastVerdict = isSustentationEvaluated ? verdictsList[verdictsList.length - 1].veredict : null;
    const isSustentationFinalized = isSustentationEvaluated && lastVerdict !== stateList.APLAZADO;

    return { ...baseContext, isSustentationFinalized };
  },

  getTableData: (documents: FileDocument[], context: ThesisEvaluationContext): SpecialRequestTableRow[] => {
    const thesis = context.thesisWork;
    if (!thesis || !thesis.specialRequests) return [];

    const isConsejo = context.isConsejo;
    const isArchived = context.isArchived ?? false;

    return thesis.specialRequests.map((req: SpecialRequest): SpecialRequestTableRow => {
      const dateStr = req.requestDate ? new Date(req.requestDate).toLocaleDateString('es-ES') : 'Sin fecha';
      const allowedActions: string[] = ['view-details'];

      if (!isArchived && isConsejo && req.status === stateList.EN_REVISION) {
        allowedActions.push('evaluate_special_request');
      }

      return {
        id: req.id,
        description: req.description,
        date: dateStr,
        status: req.status,
        allowedActions
      };
    });
  },

  getHeaderButtons: (context: ThesisEvaluationContext): TableButton[] => {
    const buttons: TableButton[] = [];
    if (context.isArchived) return buttons;

    const isSustentationFinalized = context.isSustentationFinalized ?? false;

    if (context.isDirector || context.isAdmin) {
      buttons.push({
        action: 'register_special_request',
        label: isSustentationFinalized ? 'Sustentación Finalizada' : 'Registrar Solicitud Especial',
        variant: 'primary',
        disabled: isSustentationFinalized
      });
    }
    return buttons;
  },

  modalConfig: {
    uploadDescription: '',
    uploadedByText: '',
    confirmDescription: '',
    uploadDocumentType: undefined
  }
};
