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

export const FinalDeliveryTabConfig: TabConfiguration<FinalDeliveryTableRow> = {
  // ← FIX: antes decía 'FORMATO_E', que no coincide con la clave real
  // ('ENTREGA FINAL') que usa tabStrategies en el componente principal.
  // Hoy este campo no se lee en ningún lado, así que era inofensivo — pero
  // queda alineado por si algún día se reconstruye tabStrategies a partir
  // de un arreglo de configs usando este campo como clave.
  tabValue: 'ENTREGA FINAL',
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

    const isSuspendedOrCanceled = thesis.state === stateList.SUSPENDIDO || thesis.state === stateList.CANCELADO;

    return { ...baseContext, hasFinalDelivery, isSuspendedOrCanceled };
  },

  getTableData: (documents: FileDocument[], context: ThesisEvaluationContext): FinalDeliveryTableRow[] => {
    const deliveries = context.thesisWork?.finalDeliveries || [];
    const isThesisNoAprobado = context.thesisWork?.state === stateList.NO_APROBADO;

    return deliveries.map((delivery: FinalDelivery): FinalDeliveryTableRow => {
      // ← Reemplaza la reimplementación inline de formatThesisDate.
      // Nota: si uploadDate ya llega como string, se propaga tal cual sin
      // reformatear (igual que hacía el código original); solo se llama
      // formatThesisDate cuando es un objeto Date real.
      const formattedDate = !delivery.uploadDate
        ? 'Sin fecha'
        : typeof delivery.uploadDate === 'string'
          ? delivery.uploadDate
          : formatThesisDate(delivery.uploadDate);

      const currentStatus = isThesisNoAprobado
        ? stateList.NO_APROBADO
        : (delivery.status || stateList.EN_REVISION);

      return {
        id: delivery.id,
        name: `Entrega Final - ${delivery.monograph?.name || 'Documentación'}`,
        uploadDate: formattedDate,
        status: currentStatus,
        url: '',
        allowedActions: ['view-details']
      };
    });
  },

  getHeaderButtons: (context: ThesisEvaluationContext): TableButton[] => {
    if (context.isArchived) return [];
    const buttons: TableButton[] = [];
    const thesis = context.thesisWork;
    // ← Antes: context['hasFinalDelivery'] as boolean ?? false
    const hasFinalDelivery = context.hasFinalDelivery ?? false;
    const isSuspendedOrCanceled = context.isSuspendedOrCanceled ?? false;
    const isNotApproved = thesis?.state === stateList.NO_APROBADO;

    if (context.isDirector || context.isAdmin) {
      let buttonLabel = 'Cargar entrega final';
      let buttonDisabled = false;

      if (hasFinalDelivery) {
        buttonLabel = 'Entrega final registrada';
        buttonDisabled = true;
      }
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
