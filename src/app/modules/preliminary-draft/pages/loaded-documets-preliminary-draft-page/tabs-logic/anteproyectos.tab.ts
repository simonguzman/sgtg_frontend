import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { PreliminaryDraftTabConfiguration, PreliminaryDraftEvaluationContext } from './tab-config.interface';
import { anteproyectoCorregible, versionesDelAnteproyecto } from '../../../services/preliminary-draft-rules';
import { stateList } from '../../../../../core/enums/state.enum';

export const AnteproyectosTabConfig: PreliminaryDraftTabConfiguration = {
  tabValue: 'ANTEPROYECTOS',

  columns: [
    { field: 'name', header: 'Nombre de archivo', type: 'text', width: '30%' },
    { field: 'version', header: 'Versión', type: 'text', width: '10%' },
    { field: 'uploadDate', header: 'Fecha de carga', type: 'text', width: '20%' },
    { field: 'status', header: 'Estado', type: 'state', width: '15%' },
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

  /**
   * Versiones del anteproyecto, de la más reciente a la más antigua, con el
   * estado de la revisión que envía el backend para cada una. Solo un evaluador
   * asignado que aún no concepta evalúa la versión vigente en revisión.
   */
  getTableData: (documents: FileDocument[], context: PreliminaryDraftEvaluationContext) => {
    const { preliminaryDraft, currentUser, isAssignedEvaluator, latestAnteproyectoId } = context;

    return versionesDelAnteproyecto(documents).map(document => {
      const allowedActions: string[] = ['download'];
      const esVigenteEnRevision = document.id === latestAnteproyectoId && document.status === stateList.EN_REVISION;
      const yaConcepto = preliminaryDraft.evaluations?.some(
        evaluation => evaluation.documentId === document.id && evaluation.evaluatorId === currentUser?.id
      ) ?? false;
      if (esVigenteEnRevision && isAssignedEvaluator && !yaConcepto && !preliminaryDraft.isArchived) {
        allowedActions.push('evaluate');
      }
      return { ...document, status: document.status ?? stateList.EN_REVISION, allowedActions };
    });
  },

  getHeaderButtons: (context: PreliminaryDraftEvaluationContext) => {
    if (context.preliminaryDraft.isArchived) return [];
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

    if (context.isDirector) {
      // El director radica una nueva versión tras correcciones de los evaluadores o un NO APROBADO del Consejo
      const puedeCorregir = anteproyectoCorregible(context.preliminaryDraft);
      actions.push({
        label: 'Cargar anteproyecto corregido',
        variant: 'primary',
        disabled: !puedeCorregir,
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
