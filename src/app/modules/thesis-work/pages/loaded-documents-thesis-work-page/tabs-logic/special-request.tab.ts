import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { Document, DocumentType } from '../../../../../core/interfaces/Document.interface';
import { ThesisEvaluationContext, TabConfiguration } from './tab-config.interface';
import { SpecialRequest, JurorVerdict } from '../../../interfaces/thesis-work.interface';
import { stateList } from '../../../../../core/enums/state.enum';

export const SpecialRequestTabConfig: TabConfiguration = {
  tabValue: 'SOLICITUDES',

  // 🚀 Se registra la ruta de acción del botón principal para la navegación automática del contenedor
  headerActionRoute: 'register-special-request',

  columns: [
    { field: 'description', header: 'Descripción de la Solicitud', type: 'text', width: '40%' },
    { field: 'date', header: 'Fecha de Registro', type: 'text', width: '20%' },
    { field: 'status', header: 'Estado', type: 'state', width: '20%' },
    {
      field: 'acciones', header: 'Acciones', type: 'actions', width: '20%',
      actions: [
        {
          action: 'evaluate_special_request',
          label: 'Evaluar Solicitud',
          icon: 'gavel',
          variant: 'primary',
          disabled: false
        }
      ]
    }
  ],

  enrichEvaluationContext: (baseContext: ThesisEvaluationContext): ThesisEvaluationContext => {
    const thesis = baseContext.thesisWork;
    if (!thesis) return baseContext;

    // 🔍 Determinar si la sustentación ya cerró su ciclo definitivo
    const verdictsList: JurorVerdict[] = thesis.sustentations?.[0]?.verdicts || [];
    const isSustentationEvaluated = verdictsList.length > 0;

    const lastVerdict = isSustentationEvaluated ? verdictsList[verdictsList.length - 1].veredict : null;

    // Se considera finalizada si ya se evaluó Y el veredicto no quedó en "APLAZADO"
    const isSustentationFinalized = isSustentationEvaluated && lastVerdict !== stateList.APLAZADO;

    return {
      ...baseContext,
      isSustentationFinalized
    };
  },

  getTableData: (documents: Document[], context: ThesisEvaluationContext): Record<string, unknown>[] => {
    const thesis = context.thesisWork;
    if (!thesis || !thesis.specialRequests) return [];

    // 🚀 Acceso directo y nativo desde las propiedades tipadas del contexto
    const isConsejo = !!context.isConsejo;

    return thesis.specialRequests.map((req: SpecialRequest) => {
      const dateStr = req.requestDate ? new Date(req.requestDate).toLocaleDateString('es-ES') : 'Sin fecha';
      const allowedActions: string[] = [];

      if (isConsejo && req.status === stateList.EN_REVISION) {
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

    // 🚀 Limpieza exhaustiva de los casteos por corchetes string inline
    const isDirector = !!context.isDirector;
    const isAdmin = !!context.isAdmin;
    const isSustentationFinalized = !!context['isSustentationFinalized'];

    if (isDirector || isAdmin) {
      buttons.push({
        action: 'register-special-request',
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
    // Se mantiene el bypass limpio por si la pestaña no requiere un archivo PDF inicializable
    uploadDocumentType: 'Solicitud' as unknown as DocumentType
  }
};
