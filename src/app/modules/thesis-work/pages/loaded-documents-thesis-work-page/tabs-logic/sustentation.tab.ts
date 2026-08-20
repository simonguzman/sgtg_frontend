import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { stateList } from '../../../../../core/enums/state.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { TabConfiguration, ThesisEvaluationContext } from './tab-config.interface';
import { SustentationRegistry } from '../../../interfaces/sustentation-registry.interface';
import { JurorVerdict } from '../../../interfaces/juror-verdict.interface';
import { SustentationStatus } from '../../../enums/sustentation-status.enum';

interface SustentationTableRow {
  id: string;
  name: string;
  date: string;
  status: stateList;
  allowedActions: string[];
}

function resolveDisplayStatus(sustentation: SustentationRegistry): stateList {
  if (sustentation.status === SustentationStatus.APLAZADA) return stateList.APLAZADO;
  if (sustentation.status === SustentationStatus.CANCELADA) return stateList.CANCELADO;

  const verdictsList: JurorVerdict[] = sustentation.verdicts || [];
  if (verdictsList.length === 0) return stateList.EN_REVISION;

  const lastVerdict = verdictsList[verdictsList.length - 1].veredict;
  const hadObservaciones = verdictsList.some(v => v.veredict === stateList.APROBADO_CON_OBSERVACIONES);

  if (hadObservaciones && lastVerdict === stateList.APROBADO) {
    return stateList.APROBADO_CON_OBSERVACIONES;
  }
  return lastVerdict ?? stateList.EN_REVISION;
}

export const SustentationTabConfig: TabConfiguration<SustentationTableRow> = {
  tabValue: 'SUSTENTACION',
  headerActionRoute: 'register_sustentation',
  columns: [
    { field: 'name', header: 'Detalle', type: 'text', width: '40%' },
    { field: 'date', header: 'Fecha Programada', type: 'text', width: '20%' },
    { field: 'status', header: 'Estado', type: 'state', width: '20%' },
    {
      field: 'acciones', header: 'Acciones', type: 'actions', width: '20%',
      actions: [
        { action: 'view_sustentation_details', label: 'Ver Detalles', variant: 'primary', disabled: false },
        { action: 'evaluate_sustentation', label: 'Evaluar Sustentación', icon: 'gavel', variant: 'primary', disabled: false }
      ]
    }
  ],

  enrichEvaluationContext: (baseContext: ThesisEvaluationContext): ThesisEvaluationContext => {
    const thesis = baseContext.thesisWork;
    if (!thesis) return baseContext;

    const hasApprovedPazYSalvo = thesis.documents?.some(
      (doc: FileDocument) => doc.type === DocumentType.PAZ_Y_SALVO && doc.status === stateList.APROBADO
    ) ?? false;

    const currentSustentations: SustentationRegistry[] = thesis.sustentations ?? [];
    const hasSustentationRegistered = currentSustentations.length > 0;
    const activeSustentation = currentSustentations[0];

    const isJuror = activeSustentation?.assignedJurors?.some(
      (juror) => juror.id === baseContext.currentUser?.id
    ) ?? false;

    const isSustentationEvaluated = (activeSustentation?.verdicts?.length ?? 0) > 0;

    return {
      ...baseContext,
      hasApprovedPazYSalvo,
      hasSustentationRegistered,
      isSustentationEvaluated,
      isJuror
    };
  },

  getTableData: (documents: FileDocument[], context: ThesisEvaluationContext): SustentationTableRow[] => {
    const thesis = context.thesisWork;
    if (!thesis || !thesis.sustentations || thesis.sustentations.length === 0) return [];

    const isJurorContext = !!context.isJuror;
    const totalSustentations = thesis.sustentations.length;

    return thesis.sustentations.map((sustentation: SustentationRegistry, index: number): SustentationTableRow => {
      const dateRaw = sustentation.sustentationDate;
      const dateStr = dateRaw ? new Date(dateRaw).toLocaleDateString('es-ES') : 'Fecha pendiente';

      const currentStatus = resolveDisplayStatus(sustentation);

      const allowedActions: string[] = ['view_sustentation_details'];
      const isThisEvaluated = (sustentation.verdicts?.length ?? 0) > 0;
      const isPostponedOrCanceled = sustentation.status === SustentationStatus.APLAZADA || sustentation.status === SustentationStatus.CANCELADA;

      if (!context.isArchived && (isJurorContext || context.isAdmin) && !isThisEvaluated && !isPostponedOrCanceled) {
        allowedActions.push('evaluate_sustentation');
      }

      const sustentationNumber = totalSustentations - index;

      return {
        id: sustentation.id,
        name: `Programación oficial de Sustentación #${sustentationNumber}`,
        date: dateStr,
        status: currentStatus,
        allowedActions
      };
    });
  },

  getHeaderButtons: (context: ThesisEvaluationContext): TableButton[] => {
    if (context.isArchived) return [];
    const buttons: TableButton[] = [];
    const thesis = context.thesisWork;
    const { isConsejo, hasApprovedPazYSalvo, hasSustentationRegistered, isSustentationEvaluated } = context;

    if (isConsejo) {
      const activeSustentation = thesis?.sustentations?.[0];
      const verdictsList: JurorVerdict[] = activeSustentation?.verdicts || [];
      const lastVerdict = verdictsList.length > 0 ? verdictsList[verdictsList.length - 1].veredict : null;
      const isAdministrativelyPostponed = activeSustentation?.status === SustentationStatus.APLAZADA;

      let buttonLabel = 'Registrar Sustentación';
      let buttonDisabled = false;

      if (!hasApprovedPazYSalvo) {
        buttonLabel = 'Requiere Paz y Salvo Aprobado';
        buttonDisabled = true;
      } else if (!hasSustentationRegistered) {
        buttonLabel = 'Registrar Sustentación';
      } else if (lastVerdict === stateList.APLAZADO || isAdministrativelyPostponed) {
        buttonLabel = 'Registrar Nueva Sustentación';
        buttonDisabled = false;
      } else if (isSustentationEvaluated) {
        buttonLabel = 'Sustentación Evaluada';
        buttonDisabled = true;
      } else {
        buttonLabel = 'Sustentación Programada';
        buttonDisabled = true;
      }

      buttons.push({
        action: 'register_sustentation',
        label: buttonLabel,
        variant: 'primary',
        disabled: buttonDisabled
      });
    }
    return buttons;
  },

  modalConfig: {
    uploadDescription: '',
    uploadedByText: '',
    confirmDescription: '',
    uploadDocumentType: DocumentType.FORMATO_E
  }
};
