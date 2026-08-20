import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { TabConfiguration, ThesisEvaluationContext } from './tab-config.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { Advance } from '../../../interfaces/advance.interface';
import { Evaluation } from '../../../../../core/interfaces/evaluation.interface';
import { formatThesisDate } from '../../../helpers/thesis-date.helper';

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

export const AdvancesTabConfig: TabConfiguration<AdvanceTableRow> = {
  tabValue: 'AVANCES',
  headerActionRoute: 'upload_advance',
  columns: [
    { field: 'name', header: 'Nombre del Avance', type: 'text', width: '35%' },
    { field: 'uploadDate', header: 'Fecha', type: 'text', width: '20%' },
    { field: 'status', header: 'Estado', type: 'state', width: '20%' },
    {
      field: 'acciones', header: 'Acciones', type: 'actions', width: '25%',
      actions: [
        { action: 'view-details', label: 'Ver detalles', icon: 'visibility', variant: 'primary', disabled: false },
        { action: 'evaluate-advance', label: 'Evaluar avance', icon: 'assignment', variant: 'primary', disabled: false }
      ]
    }
  ],

  enrichEvaluationContext: (baseContext: ThesisEvaluationContext): ThesisEvaluationContext => {
    const thesis = baseContext.thesisWork;
    if (!thesis) return baseContext;

    const proposal = thesis.preliminaryDraftData?.proposalData;
    let requiredEvaluatorsCount = 0;
    if (proposal?.director) requiredEvaluatorsCount++;
    if (proposal?.codirector) requiredEvaluatorsCount++;
    if (proposal?.advisor) requiredEvaluatorsCount++;

    const advances: Advance[] = thesis.advances || [];
    const latestAdvance = advances.length > 0 ? advances[0] : null;
    const isLatestAdvancePending = latestAdvance?.status === stateList.EN_REVISION;

    const hasFinalDelivery = thesis.documents?.some(
      (doc: FileDocument) => doc.type === DocumentType.FORMATO_E
    ) ?? false;

    const isSuspendedOrCanceled = thesis.state === stateList.SUSPENDIDO || thesis.state === stateList.CANCELADO;

    return {
      ...baseContext,
      latestAdvanceId: latestAdvance?.id || null,
      isLatestAdvancePending,
      requiredEvaluatorsCount,
      hasFinalDelivery,
      isSuspendedOrCanceled
    };
  },

  getTableData: (documents: FileDocument[], context: ThesisEvaluationContext): AdvanceTableRow[] => {
    const activeAdvances: Advance[] = context.thesisWork?.advances || [];
    const hasFinalDelivery = context.hasFinalDelivery ?? false;
    const isArchived = context.isArchived ?? false;

    return activeAdvances.map((adv: Advance): AdvanceTableRow => {
      // Usamos Set para evitar cualquier acción duplicada accidentalmente
      const allowedActions = new Set<string>(['view-details']);

      const evaluationsForThisAdvance: Evaluation[] = context.thesisWork?.evaluations?.filter(
        (ev: Evaluation) => ev.advanceId === adv.id
      ) || [];

      const alreadyEvaluated = evaluationsForThisAdvance.some(
        ev => ev.evaluatorId === context.currentUser?.id
      );
      const isAssignedEvaluator = context.isDirector || context.isCodirector || context.isAdvisor || context.isAdmin;

      if (!isArchived && isAssignedEvaluator && !alreadyEvaluated && !hasFinalDelivery && adv.status !== stateList.EVALUADO) {
        allowedActions.add('evaluate-advance');
      }

      const dateStr = adv.uploadDate
        ? formatThesisDate(typeof adv.uploadDate === 'string' ? new Date(adv.uploadDate) : adv.uploadDate)
        : 'Sin fecha';

      return {
        id: adv.id,
        name: adv.title,
        comments: adv.comments,
        uploadDate: dateStr,
        status: adv.status,
        documents: adv.documents || [],
        url: adv.documents?.[0]?.url || '',
        allowedActions: Array.from(allowedActions) // Convertimos el Set de nuevo a Array
      };
    });
  },

  getHeaderButtons: (context: ThesisEvaluationContext): TableButton[] => {
    if (context.isArchived) return [];

    const buttons: TableButton[] = [];
    const hasFinalDelivery = context.hasFinalDelivery ?? false;
    const isSuspendedOrCanceled = context.isSuspendedOrCanceled ?? false;

    if (context.isStudent || context.isAdmin) {
      let buttonLabel = 'Cargar nuevo avance';
      let buttonDisabled = context.isLatestAdvancePending ?? false;

      if (hasFinalDelivery) {
        buttonLabel = 'Entrega final registrada';
        buttonDisabled = true;
      } else if (context.isLatestAdvancePending) {
        buttonLabel = 'Avance en revisión';
      }

      if (isSuspendedOrCanceled) {
        buttonDisabled = true;
      }

      buttons.push({
        action: 'upload_advance',
        label: buttonLabel,
        variant: 'primary',
        disabled: buttonDisabled
      });
    }
    return buttons;
  },

  modalConfig: {
    uploadDescription: 'Seleccione el archivo PDF del avance de desarrollo',
    uploadedByText: 'Estudiante',
    confirmDescription: '¿Está seguro de cargar este avance? Se notificará al director, codirector y asesor (si aplican).',
    uploadDocumentType: DocumentType.AVANCE
  }
};
