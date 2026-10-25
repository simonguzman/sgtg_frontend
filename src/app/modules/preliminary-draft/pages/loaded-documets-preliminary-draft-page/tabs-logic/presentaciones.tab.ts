import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { PreliminaryDraftTabConfiguration, PreliminaryDraftEvaluationContext } from './tab-config.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { versionVigente } from '../../../services/preliminary-draft-rules';
import { formatDisplayDate } from '../../../../../core/utils/date-utils';

export const PresentacionesTabConfig: PreliminaryDraftTabConfiguration = {
  tabValue: 'PRESENTACIONES',

  columns: [
    { field: 'name', header: 'Nombre de archivo', type: 'text', width: '30%' },
    { field: 'version', header: 'Versión remitida', type: 'text', width: '10%' },
    { field: 'uploadDate', header: 'Fecha de carga', type: 'text', width: '20%' },
    { field: 'status', header: 'Estado', type: 'state', width: '15%' },
    {
      field: 'acciones', header: 'Acciones', type: 'actions', width: '25%',
      actions: [
        { action: 'download', label: 'Descargar', icon: 'download', variant: 'primary', disabled: false },
        { action: 'evaluate-presentation', label: 'Evaluar presentación', icon: 'assignment', variant: 'primary', disabled: false }
      ]
    }
  ],

  enrichEvaluationContext: (baseContext: PreliminaryDraftEvaluationContext) => baseContext,

  /**
   * Formatos C con los que el Jefe remitió cada versión aprobada, del más
   * reciente al más antiguo, con el estado de la decisión del Consejo. Solo el
   * Consejo evalúa la remisión vigente mientras está en revisión.
   */
  getTableData: (documents: FileDocument[], context: PreliminaryDraftEvaluationContext) => {
    const { preliminaryDraft, latestPresentacionId } = context;
    return remisiones(documents).map(document => {
      const allowedActions = ['download'];
      const status = document.status ?? stateList.EN_REVISION;
      if (document.id === latestPresentacionId && context.isConsejoMember && status === stateList.EN_REVISION
        && !preliminaryDraft.isArchived) {
        allowedActions.push('evaluate-presentation');
      }
      const uploadDate = document.uploadDate instanceof Date ? formatDisplayDate(document.uploadDate) : document.uploadDate;
      return { ...document, uploadDate, status, allowedActions };
    });
  },

  /**
   * El Jefe de departamento remite al Consejo la versión vigente del
   * anteproyecto cuando ambos evaluadores la aprobaron y aún no se ha remitido.
   */
  getHeaderButtons: (context: PreliminaryDraftEvaluationContext) => {
    if (context.preliminaryDraft.isArchived || !context.isJefe) return [];

    const vigente = versionVigente(context.preliminaryDraft);
    const yaRemitida = remisiones(context.preliminaryDraft.documents ?? [])
      .some(remision => remision.version === vigente?.version);
    const puedeRemitir = vigente?.status === stateList.APROBADO && !yaRemitida
      && context.preliminaryDraft.state === stateList.EVALUADO;

    return [{
      label: 'Remitir al Consejo (formato C)',
      variant: 'primary',
      disabled: !puedeRemitir,
      action: 'upload_document'
    }];
  },

  modalConfig: {
    uploadDescription: 'Seleccione el formato C (remisión del anteproyecto al Consejo de Facultad)',
    uploadedByText: 'Jefe de Departamento',
    confirmDescription: '¿Está seguro de remitir el anteproyecto al Consejo de Facultad con este formato C?',
    uploadDocumentType: DocumentType.FORMATO_C,
    emptyMessage: 'No hay presentaciones registradas para este anteproyecto'
  }
};

/** Formatos C de remisión al Consejo, del más reciente al más antiguo (por versión remitida). */
function remisiones(documents: FileDocument[]): FileDocument[] {
  return documents
    .filter(document => document.type === DocumentType.FORMATO_C)
    .sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
}
