import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { TabConfiguration, ThesisEvaluationContext } from './tab-config.interface';
import { stateList } from '../../../../../core/enums/state.enum';

interface AdvanceRegistry {
  id: string;
  title: string;
  comments: string;
  uploadDate: Date | string;
  documents?: FileDocument[];
  status: stateList;
}

interface EvaluationRegistry {
  id: string;
  advanceId?: string;
  evaluatorId?: string;
}

export const AdvancesTabConfig: TabConfiguration = {
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

    const advances: AdvanceRegistry[] = thesis.advances || [];
    const latestAdvance = advances.length > 0 ? advances[0] : null;
    const isLatestAdvancePending = latestAdvance?.status === stateList.EN_REVISION;
    const hasFinalDelivery = thesis.documents?.some(
      (doc: FileDocument) => doc.type === DocumentType['FORMATO_E']
    ) ?? false;

    // Validación del estado del trabajo de grado
    const isSuspendedOrCanceled = thesis.state === stateList.SUSPENDIDO || thesis.state === stateList.CANCELADO;

    return {
      ...baseContext,
      latestAdvanceId: latestAdvance?.id || null,
      isLatestAdvancePending,
      requiredEvaluatorsCount,
      hasFinalDelivery,
      isSuspendedOrCanceled // Añadido al contexto
    };
  },

  getTableData: (documents: FileDocument[], context: ThesisEvaluationContext): Record<string, unknown>[] => {
    const activeAdvances: AdvanceRegistry[] = context.thesisWork?.advances || [];
    const hasFinalDelivery = context['hasFinalDelivery'] as boolean ?? false
    const isArchived = context.isArchived ?? false;
    return activeAdvances.map((adv: AdvanceRegistry) => {
      const allowedActions = ['view-details'];
      const evaluationsForThisAdvance: EvaluationRegistry[] = context.thesisWork?.evaluations?.filter(
        (ev: EvaluationRegistry) => ev.advanceId === adv.id
      ) || [];
      const alreadyEvaluated = evaluationsForThisAdvance.some(
        (ev: EvaluationRegistry) => ev.evaluatorId === context.currentUser?.id
      );
      const isAssignedEvaluator = context.isDirector || context.isCodirector || context.isAdvisor || context.isAdmin;
      if (!isArchived && isAssignedEvaluator && !alreadyEvaluated && !hasFinalDelivery && adv.status !== stateList.EVALUADO) {
        allowedActions.push('evaluate-advance');
      }
      if (isAssignedEvaluator && !alreadyEvaluated && !hasFinalDelivery && adv.status !== stateList.EVALUADO) {
        allowedActions.push('evaluate-advance');
      }
      if (evaluationsForThisAdvance.length > 0) {
        allowedActions.push('view-details');
      }
      let dateStr = 'Sin fecha';
      if (adv.uploadDate) {
        const dateObj = typeof adv.uploadDate === 'string'
          ? new Date(adv.uploadDate)
          : adv.uploadDate;

        if (!Number.isNaN(dateObj.getTime())) {
          dateStr = dateObj.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          }).replaceAll('/', ' - ');
        }
      }

      return {
        id: adv.id,
        name: adv.title,
        comments: adv.comments,
        uploadDate: dateStr,
        status: adv.status,
        documents: adv.documents || [],
        url: adv.documents?.[0]?.url || '',
        allowedActions
      };
    });
  },

  getHeaderButtons: (context: ThesisEvaluationContext): TableButton[] => {
    if (context.isArchived) return [];
    const buttons: TableButton[] = [];
    const hasFinalDelivery = context['hasFinalDelivery'] as boolean ?? false;
    const isSuspendedOrCanceled = context['isSuspendedOrCanceled'] as boolean ?? false;

    if (context.isStudent || context.isAdmin) {
      let buttonLabel = 'Cargar nuevo avance';
      let buttonDisabled = context.isLatestAdvancePending;

      if (hasFinalDelivery) {
        buttonLabel = 'Entrega final registrada';
        buttonDisabled = true;
      } else if (context.isLatestAdvancePending) {
        buttonLabel = 'Avance en revisión';
      }

      // 👇 AQUÍ APLICAMOS EL BLOQUEO VISUAL
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
