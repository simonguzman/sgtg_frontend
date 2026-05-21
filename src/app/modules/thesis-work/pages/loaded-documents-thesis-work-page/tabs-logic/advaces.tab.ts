// tabs-logic/advances.tab.ts
import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { stateList } from '../../../../../core/enums/state.enum';
import { Document, DocumentType } from '../../../../../core/interfaces/Document.interface';
import { TabConfiguration, ThesisEvaluationContext } from './tab-config.interface';

// Ajustamos la interfaz interna para que coincida exactamente con tus modelos globales
interface AdvanceRegistry {
  id: string;
  title: string;
  uploadDate: Date; // 🚀 Corregido: Ahora es de tipo Date nativo
  documents?: Document[];
}

interface EvaluationRegistry {
  id: string;
  documentId: string;
  evaluatorName?: string;
}

export const AdvancesTabConfig: TabConfiguration = {
  tabValue: 'AVANCES',
  columns: [
    { field: 'name', header: 'Nombre del Avance', type: 'text', width: '35%' },
    { field: 'uploadDate', header: 'Fecha', type: 'text', width: '20%' },
    { field: 'status', header: 'Estado', type: 'state', width: '20%' },
    {
      field: 'acciones', header: 'Acciones', type: 'actions', width: '25%',
      actions: [
        { action: 'download', label: 'Descargar', icon: 'download', variant: 'primary', disabled: false },
        { action: 'evaluate-advance', label: 'Evaluar avance', icon: 'assignment', variant: 'primary', disabled: false }
      ]
    }
  ],

  enrichEvaluationContext: (baseContext: ThesisEvaluationContext): ThesisEvaluationContext => {
    const thesis = baseContext.thesisWork;
    if (!thesis) return baseContext;

    const proposal = thesis.preliminaryDraftData?.proposalData;

    // 🧠 1. Calcular cuántos docentes DEBEN evaluar obligatoriamente
    let requiredEvaluatorsCount = 0;
    if (proposal?.director) requiredEvaluatorsCount++;
    if (proposal?.codirector) requiredEvaluatorsCount++;
    if (proposal?.advisor) requiredEvaluatorsCount++;

    const advances: AdvanceRegistry[] = thesis.advances || [];
    const latestAdvance = advances.length > 0 ? advances[0] : null;

    let isLatestAdvancePending = false;
    if (latestAdvance) {
      const evaluations: EvaluationRegistry[] = thesis.evaluations?.filter(
        (ev: EvaluationRegistry) => ev.documentId === latestAdvance.id
      ) || [];

      // 🧠 2. Está pendiente si el número de evaluaciones es menor a los requeridos
      isLatestAdvancePending = evaluations.length < requiredEvaluatorsCount;
    }

    // 🔍 Verificar si ya existe el Formato E (Entrega Final) registrado en el proyecto
    const hasFinalDelivery = thesis.documents?.some(
      (doc: Document) => doc.type === DocumentType['FORMATO E']
    ) ?? false;

    return {
      ...baseContext,
      latestAdvanceId: latestAdvance?.id || null,
      isLatestAdvancePending,
      requiredEvaluatorsCount,
      hasFinalDelivery
    };
  },

  getTableData: (documents: Document[], context: ThesisEvaluationContext): Record<string, unknown>[] => {
    const activeAdvances: AdvanceRegistry[] = context.thesisWork?.advances || [];

    const requiredCount = context['requiredEvaluatorsCount'] as number ?? 1;
    const hasFinalDelivery = context['hasFinalDelivery'] as boolean ?? false;

    return activeAdvances.map((adv: AdvanceRegistry) => {
      const allowedActions = ['download'];

      const evaluationsForThisAdvance: EvaluationRegistry[] = context.thesisWork?.evaluations?.filter(
        (ev: EvaluationRegistry) => ev.documentId === adv.id
      ) || [];

      const isFullyEvaluated = evaluationsForThisAdvance.length >= requiredCount;

      const displayStatus = isFullyEvaluated ? stateList.EVALUADO : stateList.EN_REVISION;

      const userFullName = `${context.currentUser?.firstName || ''} ${context.currentUser?.lastName || ''}`.trim();
      const alreadyEvaluated = evaluationsForThisAdvance.some(
        (ev: EvaluationRegistry) => ev.evaluatorName?.trim() === userFullName
      );

      const isAssignedEvaluator = context.isDirector || context.isCodirector || context.isAdvisor || context.isAdmin;

      if (isAssignedEvaluator && !alreadyEvaluated && !isFullyEvaluated && !hasFinalDelivery) {
        allowedActions.push('evaluate-advance');
      }

      // 🚀 Al ser adv.uploadDate un objeto Date, quitamos el envoltorio innecesario 'new Date()'
      const dateStr = adv.uploadDate
        ? adv.uploadDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replaceAll('/', ' - ')
        : 'Sin fecha';

      return {
        id: adv.id,
        name: adv.title,
        uploadDate: dateStr,
        status: displayStatus,
        documents: adv.documents || [],
        url: adv.documents?.[0]?.url || '',
        allowedActions
      };
    });
  },

  getHeaderButtons: (context: ThesisEvaluationContext): TableButton[] => {
    const buttons: TableButton[] = [];
    const hasFinalDelivery = context['hasFinalDelivery'] as boolean ?? false;

    if (context.isStudent || context.isAdmin) {
      let buttonLabel = 'Cargar nuevo avance';
      let buttonDisabled = context.isLatestAdvancePending;

      if (hasFinalDelivery) {
        buttonLabel = 'Entrega final registrada';
        buttonDisabled = true;
      } else if (context.isLatestAdvancePending) {
        buttonLabel = 'Avance en revisión';
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
    uploadDocumentType: DocumentType.ANEXO
  }
};
