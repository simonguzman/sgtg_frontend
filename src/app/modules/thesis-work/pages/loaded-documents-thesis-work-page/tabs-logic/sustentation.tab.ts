import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { stateList } from '../../../../../core/enums/state.enum';
import { Document, DocumentType } from '../../../../../core/interfaces/Document.interface';
import { TabConfiguration, ThesisEvaluationContext } from './tab-config.interface';
import { SustentationRegistry, JurorVerdict } from '../../../interfaces/thesis-work.interface';

export const SustentationTabConfig: TabConfiguration = {
  tabValue: 'SUSTENTACION',
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

    // 1. Validar Paz y Salvo Aprobado
    const hasApprovedPazYSalvo = thesis.documents?.some(
      (doc: Document) => doc.type === DocumentType['PAZ Y SALVO'] && doc.status === stateList.APROBADO
    ) ?? false;

    // 2. Colección completa e indicador de si hay al menos una registrada
    const currentSustentations: SustentationRegistry[] = thesis.sustentations ?? [];
    const hasSustentationRegistered = currentSustentations.length > 0;

    // 3. Tomamos la última sustentación cronológica (la activa/actual en la posición 0)
    const activeSustentation = currentSustentations[0];

    // 4. Verificar si el usuario actual es jurado asignado en la sustentación activa
    const isJuror = activeSustentation?.assignedJurors?.some(
      (juror) => juror.id === baseContext.currentUser?.id
    ) ?? false;

    // 5. Evaluar si la sustentación activa ya tiene veredictos asentados
    const isSustentationEvaluated = (activeSustentation?.verdicts?.length ?? 0) > 0;

    return {
      ...baseContext,
      hasApprovedPazYSalvo,
      hasSustentationRegistered,
      isSustentationEvaluated,
      isJuror
    };
  },

  getTableData: (documents: Document[], context: ThesisEvaluationContext): Record<string, unknown>[] => {
    const thesis = context.thesisWork;
    if (!thesis || !thesis.sustentations || thesis.sustentations.length === 0) {
      return [];
    }

    const isJurorContext = context['isJuror'] as boolean ?? false;
    const totalSustentations = thesis.sustentations.length;

    // Mapeamos todo el historial de sustentaciones para renderizar una fila por cada una
    return thesis.sustentations.map((sustentation: SustentationRegistry, index: number) => {
      const dateRaw = sustentation.sustentationDate;
      const dateStr = dateRaw ? new Date(dateRaw).toLocaleDateString('es-ES') : 'Fecha pendiente';

      const verdictsList: JurorVerdict[] = sustentation.verdicts || [];
      const isThisEvaluated = verdictsList.length > 0;

      // El estado de la fila depende de su veredicto. Si no tiene, se encuentra EN_REVISION
      const currentStatus = isThisEvaluated
        ? (verdictsList[verdictsList.length - 1].veredict ?? stateList.EN_REVISION)
        : stateList.EN_REVISION;

      const allowedActions: string[] = ['view_sustentation_details'];

      // REGLA DE NEGOCIO: Solo se permite evaluar si el usuario es jurado/admin
      // y si esa sustentación específica aún no ha sido dictaminada.
      if ((isJurorContext || context.isAdmin) && !isThisEvaluated) {
        allowedActions.push('evaluate_sustentation');
      }

      // Enumeramos las sustentaciones en orden inverso para claridad visual (ej: "Sustentación #2")
      const sustentationNumber = totalSustentations - index;

      return {
        id: sustentation.id, // ID específico de la sustentación (vital para el ruteo de la acción)
        name: `Programación oficial de Sustentación #${sustentationNumber}`,
        date: dateStr,
        status: currentStatus,
        allowedActions
      };
    });
  },

  getHeaderButtons: (context: ThesisEvaluationContext): TableButton[] => {
    const buttons: TableButton[] = [];
    const thesis = context.thesisWork;

    // Extracción segura usando las propiedades extendidas en el context
    const isConsejo = context['isConsejo'] as boolean ?? false;
    const hasApprovedPazYSalvo = context['hasApprovedPazYSalvo'] as boolean ?? false;
    const hasSustentationRegistered = context['hasSustentationRegistered'] as boolean ?? false;
    const isSustentationEvaluated = context['isSustentationEvaluated'] as boolean ?? false;

    if (isConsejo) {
      const activeSustentation = thesis?.sustentations?.[0];
      const verdictsList: JurorVerdict[] = activeSustentation?.verdicts || [];
      const lastVerdict = verdictsList.length > 0 ? verdictsList[verdictsList.length - 1].veredict : null;

      let buttonLabel = 'Registrar Sustentación';
      let buttonDisabled = false;

      if (!hasApprovedPazYSalvo) {
        buttonLabel = 'Requiere Paz y Salvo Aprobado';
        buttonDisabled = true;
      } else if (!hasSustentationRegistered) {
        buttonLabel = 'Registrar Sustentación';
      } else {
        // Si la última sustentación fue aplazada, el Consejo puede agendar una nueva en el historial
        if (lastVerdict === stateList.APLAZADO) {
          buttonLabel = 'Registrar Nueva Sustentación';
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
    uploadDocumentType: DocumentType['FORMATO E']
  }
};
