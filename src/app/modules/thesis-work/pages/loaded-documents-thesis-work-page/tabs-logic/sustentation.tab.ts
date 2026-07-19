import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { stateList } from '../../../../../core/enums/state.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { TabConfiguration, ThesisEvaluationContext } from './tab-config.interface';
import { SustentationRegistry } from '../../../interfaces/sustentation-registry.interface';
import { JurorVerdict } from '../../../interfaces/juror-verdict.interface';
import { SustentationStatus } from '../../../enums/sustentation-status.enum';

export const SustentationTabConfig: TabConfiguration = {
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
      (doc: FileDocument) => doc.type === DocumentType['PAZ_Y_SALVO'] && doc.status === stateList.APROBADO
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

  getTableData: (documents: FileDocument[], context: ThesisEvaluationContext): Record<string, unknown>[] => {
    const thesis = context.thesisWork;
    if (!thesis || !thesis.sustentations || thesis.sustentations.length === 0) {
      return [];
    }
    const isJurorContext = !!context.isJuror;
    const totalSustentations = thesis.sustentations.length;

    return thesis.sustentations.map((sustentation: SustentationRegistry, index: number) => {
      const dateRaw = sustentation.sustentationDate;
      const dateStr = dateRaw ? new Date(dateRaw).toLocaleDateString('es-ES') : 'Fecha pendiente';
      const verdictsList: JurorVerdict[] = sustentation.verdicts || [];
      const isThisEvaluated = verdictsList.length > 0;

      let currentStatus: string | stateList = stateList.EN_REVISION;

      // Mapeo explícito para que el pill reconozca el color correcto del Enum general
      if (sustentation.status === SustentationStatus.APLAZADA) {
        currentStatus = stateList.APLAZADO;
      } else if (sustentation.status === SustentationStatus.CANCELADA) {
        currentStatus = stateList.CANCELADO;
      } else if (isThisEvaluated) {

        // --- INICIO DEL CAMBIO ---
        const lastVerdict = verdictsList[verdictsList.length - 1].veredict;

        // Verificamos si en la historia de los veredictos hubo observaciones iniciales
        const hadObservaciones = verdictsList.some(v => v.veredict === stateList.APROBADO_CON_OBSERVACIONES);

        // Si la sustentación tuvo observaciones y las correcciones fueron aprobadas,
        // forzamos a que el estado visual de la tabla siga siendo "Aprobado con observaciones".
        if (hadObservaciones && lastVerdict === stateList.APROBADO) {
          currentStatus = stateList.APROBADO_CON_OBSERVACIONES;
        } else {
          // Para cualquier otro caso (ej. Aplazado por no entregar correcciones,
          // No Aprobado, o Aprobado directamente), tomamos el último veredicto real.
          currentStatus = lastVerdict ?? stateList.EN_REVISION;
        }
        // --- FIN DEL CAMBIO ---

      }

      const allowedActions: string[] = ['view_sustentation_details'];
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
      } else {
        if (lastVerdict === stateList.APLAZADO || isAdministrativelyPostponed) {
          buttonLabel = 'Registrar Nueva Sustentación';
          buttonDisabled = false;
        } else if (isSustentationEvaluated) {
          buttonLabel = 'Sustentación Evaluada';
          buttonDisabled = true;
        } else {
          buttonLabel = 'Sustentación Programada';
          buttonDisabled = true;
        }
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
