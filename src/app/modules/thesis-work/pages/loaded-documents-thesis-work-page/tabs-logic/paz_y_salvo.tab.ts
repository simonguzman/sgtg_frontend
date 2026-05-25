import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { stateList } from '../../../../../core/enums/state.enum';
import { Document, DocumentType } from '../../../../../core/interfaces/Document.interface';
import { TabConfiguration, ThesisEvaluationContext } from './tab-config.interface';
import { FinalDelivery } from '../../../interfaces/thesis-work.interface';

export const PazYSalvoTabConfig: TabConfiguration = {
  tabValue: 'PAZ_Y_SALVO',

  // 🚀 Se registra la ruta de acción del botón principal para la navegación automática del contenedor
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

    // 🔍 1. ¿Hay una Entrega Final ACTIVA?
    const hasActiveFinalDelivery = thesis.finalDeliveries?.some(
      (delivery: FinalDelivery) => delivery.status !== stateList.NO_APROBADO
    ) ?? false;

    // 🔍 2. ¿Ya se registró un Paz y Salvo (aprobado)?
    const hasApprovedPazYSalvo = thesis.pazYSalvos?.some(
      (pys) => pys.document.status === stateList.APROBADO
    ) ?? false;

    return {
      ...baseContext,
      hasActiveFinalDelivery,
      hasApprovedPazYSalvo
    };
  },

  getTableData: (documents: Document[], context: ThesisEvaluationContext) => {
    const pySDocs = documents.filter(doc => doc.type === DocumentType['PAZ_Y_SALVO']);

    return pySDocs.map((doc: Document) => {
      // 🚀 Manejo robusto y a prueba de fallos para el formateo de las fechas
      let formattedDate = 'Sin fecha';

      if (doc.uploadDate) {
        if (typeof doc.uploadDate === 'string') {
          formattedDate = doc.uploadDate;
        } else if (doc.uploadDate instanceof Date && !isNaN(doc.uploadDate.getTime())) {
          formattedDate = doc.uploadDate
            .toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
            .replaceAll('/', ' - ');
        }
      }

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

  getHeaderButtons: (context: ThesisEvaluationContext) => {
    const buttons: TableButton[] = [];

    if (context.isDecanatura || context.isAdmin) {
      // 🚀 Eliminamos por completo el casteo inseguro 'as any'
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
