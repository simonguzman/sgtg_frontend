import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { stateList } from '../../../../../core/enums/state.enum';
import { Document, DocumentType } from '../../../../../core/interfaces/Document.interface';
import { TabConfiguration, ThesisEvaluationContext } from './tab-config.interface';
import { FinalDelivery } from '../../../interfaces/thesis-work.interface';

export const FinalDeliveryTabConfig: TabConfiguration = {
  tabValue: 'FORMATO_E',

  headerActionRoute: 'register_final_delivery',

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

    const hasFinalDelivery = thesis.finalDeliveries?.some(
      (delivery: FinalDelivery) => delivery.status !== stateList.NO_APROBADO
    ) ?? false;

    // 👇 Calculamos el estado de bloqueo
    const isSuspendedOrCanceled = thesis.state === stateList.SUSPENDIDO || thesis.state === stateList.CANCELADO;

    return {
      ...baseContext,
      hasFinalDelivery,
      isSuspendedOrCanceled // Lo inyectamos al contexto
    };
  },

  getTableData: (documents: Document[], context: ThesisEvaluationContext) => {
    const deliveries = context.thesisWork?.finalDeliveries || [];
    // 1. Detectamos si el estado general del proyecto ya fue marcado como No Aprobado
    const isThesisNoAprobado = context.thesisWork?.state === stateList.NO_APROBADO;

    return deliveries.map((delivery: FinalDelivery) => {
      const date = delivery.uploadDate;
      let formattedDate = 'Sin fecha';
      if (date) {
        if (typeof date === 'string') {
          formattedDate = date;
        } else if (date instanceof Date && !isNaN(date.getTime())) {
          formattedDate = date
            .toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
            .replaceAll('/', ' - ');
        }
      }

      // 2. Si el trabajo global está No Aprobado, la entrega final también debe mostrarlo
      const currentStatus = isThesisNoAprobado
        ? stateList.NO_APROBADO
        : (delivery.status || stateList.EN_REVISION);

      return {
        id: delivery.id,
        name: `Entrega Final - ${delivery.monograph?.name || 'Documentación'}`,
        uploadDate: formattedDate,
        status: currentStatus, // Usamos el estado evaluado
        url: '',
        allowedActions: ['view-details']
      };
    });
  },

  getHeaderButtons: (context: ThesisEvaluationContext) => {
    if (context.isArchived) return [];
    const buttons: TableButton[] = [];
    const thesis = context.thesisWork;
    const hasFinalDelivery = !!context['hasFinalDelivery'];
    const isSuspendedOrCanceled = context['isSuspendedOrCanceled'] as boolean ?? false;

    // Detectamos el estado de reprobación general
    const isNotApproved = thesis?.state === stateList.NO_APROBADO;

    if (context.isDirector || context.isAdmin) {
      let buttonLabel = 'Cargar entrega final';
      let buttonDisabled = false;

      if (hasFinalDelivery) {
        buttonLabel = 'Entrega final registrada';
        buttonDisabled = true;
      }

      // Aplicamos el bloqueo visual si está suspendido, cancelado o NO APROBADO
      if (isSuspendedOrCanceled || isNotApproved) {
        buttonDisabled = true;
      }

      buttons.push({
        action: 'register_final_delivery',
        label: buttonLabel,
        variant: 'primary',
        disabled: buttonDisabled
      });
    }

    return buttons;
  },

  modalConfig: {
    uploadDescription: 'Seleccione el archivo PDF oficial de la entrega final (Formato_E)',
    uploadedByText: 'Director de Trabajo de Grado',
    confirmDescription: '¿Está seguro de registrar este documento como la entrega final? Se actualizará el flujo del proyecto.',
    uploadDocumentType: DocumentType.FORMATO_E
  }
};
