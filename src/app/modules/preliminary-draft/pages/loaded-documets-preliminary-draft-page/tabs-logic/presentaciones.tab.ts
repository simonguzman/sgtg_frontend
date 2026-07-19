import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { PreliminaryDraftTabConfiguration, PreliminaryDraftEvaluationContext } from './tab-config.interface';
import { stateList } from '../../../../../core/enums/state.enum';

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

  getTableData: (documents: FileDocument[], context: PreliminaryDraftEvaluationContext, preliminaryDraftService: any) => {
    const { preliminaryDraft, latestPresentacionId } = context;
    const filteredDocs = documents.filter(doc => doc.type === DocumentType.FORMATO_C);

    return filteredDocs.map(document => {
      const isLatestDoc = document.id === latestPresentacionId;

      // 1. Respetamos la independencia del documento tomando su propio estado nativo primero
      let status = document.status || stateList.EN_REVISION;

      // 2. Verificamos si este documento en específico tiene evaluaciones vinculadas
      const documentEvaluations = (preliminaryDraft.evaluations || []).filter(ev => ev.documentId === document.id);

      // 3. Solo si tiene evaluaciones propias, dejamos que el servicio determine el estado final
      if (documentEvaluations.length > 0) {
        status = preliminaryDraftService.calculateDocumentStatus(document.id, preliminaryDraft.evaluations || [], 1);
      }

      // Opcional: Si aún quieres que herede el "Aprobado" global del anteproyecto,
      // lo condicionamos para que NUNCA sobreescriba un "No aprobado" de la presentación.
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

  getHeaderButtons: (context: PreliminaryDraftEvaluationContext, preliminaryDraftService: any) => {
    if (context.preliminaryDraft.isArchived) return [];
    if (!context.isJefe && !context.isAdmin) return [];

    // 1. Estado del anteproyecto más reciente
    const latestAnteproyecto = context.preliminaryDraft.documents?.find((d: any) => d.type !== DocumentType.FORMATO_C);
    const anteproyectoStatus = latestAnteproyecto
      ? preliminaryDraftService.calculateDocumentStatus(latestAnteproyecto.id, context.preliminaryDraft.evaluations || [], context.totalEvaluatorsCount)
      : null;

    // 2. Verificar si la presentación más reciente sigue en revisión (sin evaluación del consejo)
    const latestPresentacion = context.preliminaryDraft.documents?.find((d: any) => d.id === context.latestPresentacionId);
    const presentacionTieneEvaluacion = latestPresentacion
      ? (context.preliminaryDraft.evaluations || []).some((ev: any) => ev.documentId === latestPresentacion.id)
      : false;

    const isPresentacionEnRevision = latestPresentacion && !presentacionTieneEvaluacion;

    // 3. Verificar si el anteproyecto ya tiene un veredicto final del consejo (Fin del ciclo actual)
    const isDraftFinalized = [stateList.APROBADO, stateList.NO_APROBADO].includes(context.preliminaryDraft.state as stateList);

    // 4. Lógica estricta de inhabilitación:
    // - El anteproyecto aún no ha sido aprobado por los jurados
    // - O ya hay una presentación cargada esperando evaluación
    // - O el proceso ya finalizó (aprobado/rechazado por el consejo)
    const isUploadDisabled = anteproyectoStatus !== stateList.APROBADO || isPresentacionEnRevision || isDraftFinalized;

    return [{
      label: 'Cargar formato de presentación',
      variant: 'primary',
      disabled: isUploadDisabled, // Se aplica la nueva lógica combinada
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
