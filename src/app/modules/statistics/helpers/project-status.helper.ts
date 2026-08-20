import { stateList } from '../../../core/enums/state.enum';
import { ProjectStatus } from '../enum/projectStatus.enum';

/**
 * Traduce el estado real de dominio (compartido por Proposal,
 * PreliminaryDraft y ThesisWork) al estado agregado que usa el módulo de
 * estadísticas. EVALUADO no tiene entrada a propósito — nunca debería
 * llegar aquí porque StatisticsStateService.filteredData() lo excluye
 * antes; si llegara igual, cae al fallback EN_REVISION, igual que el
 * switch/default original.
 */
const STATE_TO_STATUS_MAP: Partial<Record<stateList, ProjectStatus>> = {
  [stateList.APROBADO]: ProjectStatus.APROBADO,
  [stateList.APROBADO_CON_OBSERVACIONES]: ProjectStatus.APROBADO_OBSERVACIONES,
  [stateList.NO_APROBADO]: ProjectStatus.NO_APROBADO,
  [stateList.EN_REVISION]: ProjectStatus.EN_REVISION,
  [stateList.EN_DESARROLLO]: ProjectStatus.EN_DESARROLLO,
  [stateList.APLAZADO]: ProjectStatus.APLAZADO,
  [stateList.SUSPENDIDO]: ProjectStatus.SUSPENDIDO,
  [stateList.CANCELADO]: ProjectStatus.CANCELADO
};

// ← Parámetro tipado como stateList en vez de string (el original era
// menos estricto aunque los 3 llamadores siempre pasaban un stateList real).
export function mapStateToProjectStatus(state: stateList): ProjectStatus {
  return STATE_TO_STATUS_MAP[state] ?? ProjectStatus.EN_REVISION;
}
