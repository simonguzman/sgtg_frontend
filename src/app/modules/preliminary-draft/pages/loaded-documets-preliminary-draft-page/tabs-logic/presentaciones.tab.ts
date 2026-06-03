import { Document, DocumentType } from '../../../../../core/interfaces/Document.interface';
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

  getTableData: (documents: Document[], context: PreliminaryDraftEvaluationContext, preliminaryDraftService: any) => {
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
      if (isLatestDoc && (context.isConsejoMember || context.isAdmin) && status === stateList.EN_REVISION) {
        allowedActions.push('evaluate-presentation');
      }

      return { ...document, status, allowedActions };
    });
  },

  getHeaderButtons: (context: PreliminaryDraftEvaluationContext, preliminaryDraftService: any) => {
    if (!context.isJefe && !context.isAdmin) return [];

    const latestDoc = context.preliminaryDraft.documents?.find((d: any) => d.type !== DocumentType.FORMATO_C);
    const status = latestDoc
      ? preliminaryDraftService.calculateDocumentStatus(latestDoc.id, context.preliminaryDraft.evaluations || [], context.totalEvaluatorsCount)
      : null;

    return [{
      label: 'Cargar formato de presentación',
      variant: 'primary',
      disabled: status !== stateList.APROBADO,
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
