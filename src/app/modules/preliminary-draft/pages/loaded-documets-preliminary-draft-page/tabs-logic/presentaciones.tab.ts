import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { PreliminaryDraftTabConfiguration, PreliminaryDraftEvaluationContext } from './tab-config.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { Evaluation } from '../../../../../core/interfaces/evaluation.interface';

export const PresentacionesTabConfig: PreliminaryDraftTabConfiguration = {
  tabValue: 'PRESENTACIONES',

  columns: [
    { field: 'name', header: 'Nombre de archivo', type: 'text', width: '35%' },
    { field: 'uploadDate', header: 'Fecha de carga', type: 'text', width: '20%' },
    { field: 'status', header: 'Estado', type: 'state', width: '20%' },
    {
      field: 'acciones', header: 'Acciones', type: 'actions', width: '25%',
      actions: [
        { action: 'download', label: 'Descargar', icon: 'download', variant: 'primary', disabled: false },
        { action: 'evaluate-presentation', label: 'Evaluar presentación', icon: 'assignment', variant: 'primary', disabled: false }
      ]
    }
  ],

  enrichEvaluationContext: (baseContext: PreliminaryDraftEvaluationContext) => baseContext,

  // Reemplazo de 'any' por PreliminaryDraftService
  getTableData: (documents: FileDocument[], context: PreliminaryDraftEvaluationContext, preliminaryDraftService: PreliminaryDraftService) => {
    const { preliminaryDraft, latestPresentacionId } = context;
    const filteredDocs = documents.filter(document => document.type === DocumentType.FORMATO_C);

    return filteredDocs.map(document => {
      const isLatestDoc = document.id === latestPresentacionId;

      let status = document.status || stateList.EN_REVISION;

      // Tipado estricto inferido de preliminaryDraft.evaluations (Evaluation[])
      const documentEvaluations = (preliminaryDraft.evaluations || []).filter(evaluation => evaluation.documentId === document.id);

      if (documentEvaluations.length > 0) {
        status = preliminaryDraftService.calculateDocumentStatus(document.id, preliminaryDraft.evaluations || [], 1);
      }

      if (isLatestDoc && preliminaryDraft.state === stateList.APROBADO && status !== stateList.NO_APROBADO) {
        status = stateList.APROBADO;
      }

      const allowedActions = ['download'];
      if (isLatestDoc && (context.isConsejoMember || context.isAdmin) && status === stateList.EN_REVISION && !preliminaryDraft.isArchived) {
        allowedActions.push('evaluate-presentation');
      }

      return { ...document, status, allowedActions };
    });
  },

  // Reemplazo de 'any' por PreliminaryDraftService y tipado interno de callbacks
  getHeaderButtons: (context: PreliminaryDraftEvaluationContext, preliminaryDraftService: PreliminaryDraftService) => {
    if (context.preliminaryDraft.isArchived) return [];
    if (!context.isJefe && !context.isAdmin) return [];

    // 1. Estado del anteproyecto más reciente (Tipado con FileDocument)
    const latestAnteproyecto = context.preliminaryDraft.documents?.find((d: FileDocument) => d.type !== DocumentType.FORMATO_C);
    const anteproyectoStatus = latestAnteproyecto
      ? preliminaryDraftService.calculateDocumentStatus(latestAnteproyecto.id, context.preliminaryDraft.evaluations || [], context.totalEvaluatorsCount)
      : null;

    // 2. Verificar si la presentación más reciente sigue en revisión (Tipado con FileDocument y Evaluation)
    const latestPresentacion = context.preliminaryDraft.documents?.find((d: FileDocument) => d.id === context.latestPresentacionId);
    const presentacionTieneEvaluacion = latestPresentacion
      ? (context.preliminaryDraft.evaluations || []).some((ev: Evaluation) => ev.documentId === latestPresentacion.id)
      : false;

    const isPresentacionEnRevision = latestPresentacion && !presentacionTieneEvaluacion;

    // 3. Verificar si el anteproyecto ya tiene un veredicto final del consejo
    const isPreliminaryDraftFinalized = [stateList.APROBADO, stateList.NO_APROBADO].includes(context.preliminaryDraft.state as stateList);

    // 4. Lógica estricta de inhabilitación
    const isUploadDisabled = anteproyectoStatus !== stateList.APROBADO || isPresentacionEnRevision || isPreliminaryDraftFinalized;

    return [{
      label: 'Cargar formato de presentación',
      variant: 'primary',
      disabled: isUploadDisabled,
      action: 'upload_document'
    }];
  },

  modalConfig: {
    uploadDescription: 'Seleccione el archivo PDF de la presentación al consejo',
    uploadedByText: 'Jefe de Departamento',
    confirmDescription: '¿Está seguro de cargar esta presentación al consejo?',
    uploadDocumentType: DocumentType.FORMATO_C,
    emptyMessage: 'No hay presentaciones registradas para este anteproyecto'
  }
};
