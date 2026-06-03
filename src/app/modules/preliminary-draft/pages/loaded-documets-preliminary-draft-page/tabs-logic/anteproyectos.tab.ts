import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { Document, DocumentType } from '../../../../../core/interfaces/Document.interface';
import { PreliminaryDraftTabConfiguration, PreliminaryDraftEvaluationContext } from './tab-config.interface';
import { stateList } from '../../../../../core/enums/state.enum';

export const AnteproyectosTabConfig: PreliminaryDraftTabConfiguration = {
  tabValue: 'ANTEPROYECTOS',

  columns: [
    { field: 'name', header: 'Nombre de archivo', type: 'text', width: '35%' },
    { field: 'uploadDate', header: 'Fecha de carga', type: 'text', width: '20%' },
    { field: 'status', header: 'Estado', type: 'state', width: '20%' },
    {
      field: 'acciones', header: 'Acciones', type: 'actions', width: '25%',
      actions: [
        { action: 'download', label: 'Descargar', icon: 'download', variant: 'primary', disabled: false },
        { action: 'evaluate', label: 'Evaluar anteproyecto', icon: 'assignment', variant: 'primary', disabled: false }
      ]
    }
  ],

  enrichEvaluationContext: (baseContext: PreliminaryDraftEvaluationContext) => {
    return { ...baseContext };
  },

  getTableData: (documents: Document[], context: PreliminaryDraftEvaluationContext, preliminaryDraftService: any) => {
    const { preliminaryDraft, currentUser, isAdmin, isAssignedEvaluator, totalEvaluatorsCount, latestAnteproyectoId } = context;

    const filteredDocs = documents.filter(doc => doc.type === 'Anteproyecto' || doc.type === 'Correccion');

    return filteredDocs.map(document => {
      const isLatestDoc = document.id === latestAnteproyectoId;
      let status = preliminaryDraftService.calculateDocumentStatus(document.id, preliminaryDraft.evaluations || [], totalEvaluatorsCount);

      if (!isLatestDoc) {
        status = status === stateList.APROBADO ? stateList.NO_APROBADO : status;
      } else {
        if (preliminaryDraft.state === stateList.APROBADO) status = stateList.APROBADO;
        else if (preliminaryDraft.state === stateList.NO_APROBADO) status = stateList.NO_APROBADO;
        else if (status === stateList.APROBADO) status = stateList.EVALUADO;
      }

      const allowedActions = ['download'];
      if (isLatestDoc) {
        const userFullName = `${currentUser.firstName} ${currentUser.lastName}`.trim();
        const userAlreadyEvaluated = preliminaryDraft.evaluations?.some(
          (ev: any) => ev.documentId === document.id && ev.evaluatorName.trim() === userFullName
        );
        const draftHasFinalState = [stateList.APROBADO, stateList.NO_APROBADO].includes(preliminaryDraft.state as stateList);

        if ((isAssignedEvaluator || isAdmin) && !userAlreadyEvaluated && !draftHasFinalState) {
          allowedActions.push('evaluate');
        }
      }

      return { ...document, status, allowedActions };
    });
  },

  getHeaderButtons: (context: PreliminaryDraftEvaluationContext, preliminaryDraftService: any) => {
    const actions: TableButton[] = [];
    const reviewersReady = context.totalEvaluatorsCount > 0;

    if (context.isJefe) {
      actions.push({
        label: reviewersReady ? 'Evaluadores ya asignados' : 'Asignar evaluadores',
        variant: 'primary',
        disabled: reviewersReady,
        action: 'assign_evaluators'
      });
      return actions;
    }

    if (context.isDirector || context.isAdmin) {
      // 1. Obtener el ID del documento de anteproyecto/corrección más reciente
      const latestId = context.latestAnteproyectoId;

      // 2. Calcular su estado base con el servicio
      let latestDocStatus = latestId
        ? preliminaryDraftService.calculateDocumentStatus(latestId, context.preliminaryDraft.evaluations || [], context.totalEvaluatorsCount)
        : null;

      // 3. Replicar la jerarquía de estados del negocio para el ciclo visual actual
      if (context.preliminaryDraft.state === stateList.APROBADO) {
        latestDocStatus = stateList.APROBADO;
      } else if (context.preliminaryDraft.state === stateList.NO_APROBADO) {
        latestDocStatus = stateList.NO_APROBADO;
      } else if (latestDocStatus === stateList.APROBADO) {
        latestDocStatus = stateList.EVALUADO;
      }

      // 4. Condición de deshabilitado según tus reglas:
      // - Si está en revisión (cargado sin evaluar) -> Bloqueado
      // - Si está evaluado (aprobado por ambos evaluadores) -> Bloqueado
      // - Si está aprobado de forma definitiva (aprobación global) -> Bloqueado
      // Solo quedará habilitado (false) si el estado final es NO_APROBADO (por rechazo de jurados o de consejo).
      const isUploadDisabled = [
        stateList.EN_REVISION,
        stateList.EVALUADO,
        stateList.APROBADO
      ].includes(latestDocStatus as stateList);

      actions.push({
        label: 'Cargar anteproyecto corregido',
        variant: 'primary',
        disabled: isUploadDisabled,
        action: 'upload_document'
      });
    }
    return actions;
  },

  modalConfig: {
    uploadDescription: 'Seleccione el archivo PDF del anteproyecto',
    uploadedByText: 'Estudiante',
    confirmDescription: '¿Está seguro de cargar este anteproyecto? El estado cambiará a "En revisión".',
    uploadDocumentType: DocumentType.CORRECCION,
    emptyMessage: 'No han sido registrados documentos de anteproyecto en el sistema'
  }
};
