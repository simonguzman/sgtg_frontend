import { stateList } from '../../../core/enums/state.enum';
import { ProjectStatus } from '../enum/projectStatus.enum';

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

export function mapStateToProjectStatus(state: stateList): ProjectStatus {
  return STATE_TO_STATUS_MAP[state] ?? ProjectStatus.EN_REVISION;
}
