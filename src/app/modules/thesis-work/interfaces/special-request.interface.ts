import { stateList } from "../../../core/enums/state.enum";
import { SpecialRequestType } from "../enums/special-request-type.enum";

export interface SpecialRequest {
  id: string;
  directorId: string;
  requestType: SpecialRequestType;
  requestDate: Date;
  description: string;
  status: stateList.EN_REVISION | stateList.APROBADO | stateList.NO_APROBADO;
  resolutionDetails?: string;
  grantedDeadline?: Date | string;
  evaluatorId?: string;
}
