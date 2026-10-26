import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { TabConfiguration, ThesisEvaluationContext } from './tab-config.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { Advance } from '../../../interfaces/advance.interface';
import { Evaluation } from '../../../../../core/interfaces/evaluation.interface';
import { formatThesisDate } from '../../../helpers/thesis-date.helper';
import { Modality } from '../../../../proposal/enums/modality.enum';

export interface AdvanceTableRow {
  id: string;
  name: string;
  comments: string;
  uploadDate: string;
  status: stateList;
  documents: FileDocument[];
  url: string;
  allowedActions: string[];
}

/** Etapas del backend en las que se radican informes mensuales. */
const ETAPAS_CON_INFORMES = ['EN_CURSO', 'PRORROGA'];

/**
 * Informes mensuales de avance. Los radica un estudiante (en práctica
 * profesional también el director) mientras el trabajo está en curso o en
 * prórroga; los revisan el director, el codirector o el asesor, una vez cada uno.
 */
export const AdvancesTabConfig: TabConfiguration<AdvanceTableRow> = {
  tabValue: 'AVANCES',
  headerActionRoute: 'upload_advance',
  columns: [
    { field: 'name', header: 'Informe', type: 'text', width: '35%' },
    { field: 'uploadDate', header: 'Fecha', type: 'text', width: '20%' },
    { field: 'status', header: 'Estado', type: 'state', width: '20%' },
    {
      field: 'acciones', header: 'Acciones', type: 'actions', width: '25%',
      actions: [
        { action: 'view-details', label: 'Ver detalles', icon: 'visibility', variant: 'primary', disabled: false },
        { action: 'evaluate-advance', label: 'Revisar informe', icon: 'assignment', variant: 'primary', disabled: false }
      ]
    }
  ],

  enrichEvaluationContext: (baseContext: ThesisEvaluationContext): ThesisEvaluationContext => {
    const thesis = baseContext.thesisWork;
    if (!thesis) return baseContext;

    const advances: Advance[] = thesis.advances || [];
    const latestAdvance = advances.length > 0 ? advances[0] : null;
    const isPracticaProfesional = thesis.preliminaryDraftData?.proposalData?.modality === Modality.PP;

    return {
      ...baseContext,
      latestAdvanceId: latestAdvance?.id || null,
      isLatestAdvancePending: latestAdvance?.status === stateList.EN_REVISION,
      canUploadReport: baseContext.isStudent || (baseContext.isDirector && isPracticaProfesional),
      acceptsReports: ETAPAS_CON_INFORMES.includes(thesis.stage ?? 'EN_CURSO')
    };
  },

  getTableData: (_documents: FileDocument[], context: ThesisEvaluationContext): AdvanceTableRow[] => {
    const activeAdvances: Advance[] = context.thesisWork?.advances || [];
    const isArchived = context.isArchived ?? false;
    const isReviewer = context.isDirector || context.isCodirector || context.isAdvisor;

    return activeAdvances.map((advance: Advance): AdvanceTableRow => {
      const allowedActions = new Set<string>(['view-details']);

      const alreadyReviewed = (context.thesisWork?.evaluations ?? []).some(
        (evaluation: Evaluation) => evaluation.advanceId === advance.id && evaluation.evaluatorId === context.currentUser?.id
      );
      if (!isArchived && isReviewer && !alreadyReviewed) {
        allowedActions.add('evaluate-advance');
      }

      let dateStr = 'Sin fecha';
      if (advance.uploadDate) {
        const parsedDate = typeof advance.uploadDate === 'string' ? new Date(advance.uploadDate) : advance.uploadDate;
        dateStr = formatThesisDate(parsedDate);
      }

      return {
        id: advance.id,
        name: advance.title,
        comments: advance.comments,
        uploadDate: dateStr,
        status: advance.status,
        documents: advance.documents || [],
        url: advance.documents?.[0]?.url || '',
        allowedActions: Array.from(allowedActions)
      };
    });
  },

  getHeaderButtons: (context: ThesisEvaluationContext): TableButton[] => {
    if (context.isArchived || !context['canUploadReport']) return [];
    const acceptsReports = !!context['acceptsReports'];
    return [{
      action: 'upload_advance',
      label: acceptsReports ? 'Cargar informe mensual' : 'Informes no disponibles en esta etapa',
      variant: 'primary',
      disabled: !acceptsReports
    }];
  },

  modalConfig: {
    uploadDescription: 'Seleccione el PDF del informe mensual',
    uploadedByText: 'Estudiante',
    confirmDescription: '¿Está seguro de radicar este informe mensual? Se notificará al director, codirector y asesor (si aplican).',
    uploadDocumentType: DocumentType.AVANCE
  }
};
