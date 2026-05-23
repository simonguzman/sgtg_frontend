// tabs-logic/final-delivery.tab.ts
import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { stateList } from '../../../../../core/enums/state.enum';
import { Document, DocumentType } from '../../../../../core/interfaces/Document.interface';
import { TabConfiguration, ThesisEvaluationContext } from './tab-config.interface';
import { FinalDelivery } from '../../../interfaces/thesis-work.interface';

export const FinalDeliveryTabConfig: TabConfiguration = {
  tabValue: 'FORMATO_E',
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

    // 🔍 Buscamos en el nuevo array de entregas
    const hasFinalDelivery = thesis.finalDeliveries?.some(
      (delivery: FinalDelivery) => delivery.status !== stateList.NO_APROBADO
    ) ?? false;

    return {
      ...baseContext,
      hasFinalDelivery
    };
  },

  getTableData: (documents: Document[], context: ThesisEvaluationContext) => {
    // 🔍 Ignoramos 'documents' genéricos y sacamos la data de finalDeliveries
    const deliveries = context.thesisWork?.finalDeliveries || [];

    return deliveries.map((delivery: FinalDelivery) => {
      const date = delivery.uploadDate;
      const formattedDate = typeof date === 'string'
        ? date
        : date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replaceAll('/', ' - ');

      return {
        id: delivery.id, // ID del contenedor (FinalDelivery)
        name: `Entrega Final - ${delivery.monograph.name}`,
        uploadDate: formattedDate,
        status: delivery.status || stateList.EN_REVISION,
        url: '',
        allowedActions: ['view-details']
      };
    });
  },

  getHeaderButtons: (context: ThesisEvaluationContext) => {
    const buttons: TableButton[] = [];
    const hasFinalDelivery = context['hasFinalDelivery'] || false;

    // 🔒 Regla de negocio intacta: Solo Director o Administrador
    if (context.isDirector || context.isAdmin) {
      let buttonLabel = 'Cargar entrega final';
      let buttonDisabled = false;

      // 🛑 Bloqueo Reactivo: Si ya existe una entrega registrada, congelamos el botón
      if (hasFinalDelivery) {
        buttonLabel = 'Entrega final registrada';
        buttonDisabled = true;
      }

      buttons.push({
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
