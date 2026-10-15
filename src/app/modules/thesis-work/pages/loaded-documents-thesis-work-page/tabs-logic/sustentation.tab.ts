import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { stateList } from '../../../../../core/enums/state.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { TabConfiguration, ThesisEvaluationContext } from './tab-config.interface';
import { SustentationRegistry } from '../../../interfaces/sustentation-registry.interface';
import { SustentationStatus } from '../../../enums/sustentation-status.enum';
import { formatThesisDate } from '../../../helpers/thesis-date.helper';

interface SustentationTableRow {
  id: string;
  name: string;
  date: string;
  status: stateList;
  allowedActions: string[];
}

/** Estado de una sesión para la tabla: aplazada, en revisión o el veredicto del coordinador. */
function resolveDisplayStatus(sustentation: SustentationRegistry): stateList {
  if (sustentation.status === SustentationStatus.APLAZADA) return stateList.APLAZADO;
  if (sustentation.status === SustentationStatus.CANCELADA) return stateList.CANCELADO;
  if (sustentation.nonAttendance) return stateList.NO_APROBADO;
  return sustentation.verdicts.at(-1)?.veredict ?? stateList.EN_REVISION;
}

/**
 * Sesiones de sustentación (la más reciente primero). El Consejo programa la
 * primera sesión tras la solicitud y la segunda tras un aplazamiento; el
 * jurado coordinador califica la sesión actual (o registra la inasistencia).
 */
export const SustentationTabConfig: TabConfiguration<SustentationTableRow> = {
  tabValue: 'SUSTENTACION',
  headerActionRoute: 'register_sustentation',
  columns: [
    { field: 'name', header: 'Sesión', type: 'text', width: '40%' },
    { field: 'date', header: 'Fecha programada', type: 'text', width: '20%' },
    { field: 'status', header: 'Estado', type: 'state', width: '20%' },
    {
      field: 'acciones', header: 'Acciones', type: 'actions', width: '20%',
      actions: [
        { action: 'view_sustentation_details', label: 'Ver detalles', icon: 'visibility', variant: 'primary', disabled: false },
        { action: 'evaluate_sustentation', label: 'Calificar sustentación', icon: 'gavel', variant: 'primary', disabled: false }
      ]
    }
  ],

  enrichEvaluationContext: (baseContext: ThesisEvaluationContext): ThesisEvaluationContext => {
    const thesis = baseContext.thesisWork;
    if (!thesis) return baseContext;
    return {
      ...baseContext,
      hasSustentationRegistered: (thesis.sustentations?.length ?? 0) > 0,
      isSustentationEvaluated: (thesis.sustentations?.[0]?.verdicts?.length ?? 0) > 0
    };
  },

  getTableData: (_documents: FileDocument[], context: ThesisEvaluationContext): SustentationTableRow[] => {
    const thesis = context.thesisWork;
    if (!thesis?.sustentations?.length) return [];
    const process = thesis.sustentation;
    const canGrade = !context.isArchived && !!context.isCoordinator && process?.state === 'PROGRAMADA'
      && !process.hasPendingNewDate;

    return thesis.sustentations.map((sustentation: SustentationRegistry, index: number): SustentationTableRow => {
      const allowedActions: string[] = ['view_sustentation_details'];
      // Solo la sesión actual (la primera de la lista) se califica
      if (canGrade && index === 0) allowedActions.push('evaluate_sustentation');
      const date = sustentation.sustentationDate
        ? `${formatThesisDate(new Date(sustentation.sustentationDate))} ${sustentation.sustentationTime ?? ''}`.trim()
        : 'Fecha pendiente';
      return {
        id: sustentation.id,
        name: `Sesión ${sustentation.number ?? thesis.sustentations!.length - index} de sustentación`
          + (sustentation.location ? ` · ${sustentation.location}` : ''),
        date,
        status: resolveDisplayStatus(sustentation),
        allowedActions
      };
    });
  },

  getHeaderButtons: (context: ThesisEvaluationContext): TableButton[] => {
    if (context.isArchived || !context.isConsejo) return [];
    const state = context.thesisWork?.sustentation?.state;
    let label = 'Esperando la solicitud del director';
    let disabled = true;
    if (state === 'SOLICITADA') {
      label = 'Programar sustentación';
      disabled = false;
    } else if (state === 'APLAZADA') {
      label = 'Programar segunda sesión';
      disabled = false;
    } else if (state) {
      label = 'Sustentación programada';
    }
    return [{ action: 'register_sustentation', label, variant: 'primary', disabled }];
  },

  modalConfig: {
    uploadDescription: '',
    uploadedByText: '',
    confirmDescription: '',
    uploadDocumentType: DocumentType.FORMATO_E
  }
};
