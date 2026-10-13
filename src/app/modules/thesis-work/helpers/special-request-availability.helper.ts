import { stateList } from '../../../core/enums/state.enum';
import { SpecialRequestType } from '../enums/special-request-type.enum';
import { ThesisWork } from '../interfaces/thesis-work.interface';

/**
 * Solicitudes que el director puede registrar según la etapa del trabajo y
 * las que ya tiene (mismas reglas del backend, sin los plazos: esos los valida
 * el backend con su fecha y se muestran en el formulario):
 *
 * - Cambio de título y objetivos: en curso, sin una pendiente y solo si no se aprobó antes.
 * - Prórroga: en curso y una sola vez.
 * - Suspensión: en curso o en prórroga, sin una pendiente y solo si no se aprobó antes.
 * - Reanudación: solo si está suspendido.
 * - Cancelación: mientras no esté cerrado y sin una pendiente.
 */
export function availableRequestTypes(thesis: ThesisWork): SpecialRequestType[] {
  if (thesis.isArchived) return [];
  const stage = thesis.stage ?? 'EN_CURSO';
  const requests = thesis.specialRequests ?? [];
  const pending = (type: SpecialRequestType) =>
    requests.some(r => r.requestType === type && r.status === stateList.EN_REVISION);
  const approved = (type: SpecialRequestType) =>
    requests.some(r => r.requestType === type && r.status === stateList.APROBADO);

  const types: SpecialRequestType[] = [];
  if (stage === 'EN_CURSO' && !pending(SpecialRequestType.CAMBIO_TITULO) && !approved(SpecialRequestType.CAMBIO_TITULO)) {
    types.push(SpecialRequestType.CAMBIO_TITULO);
  }
  if (stage === 'EN_CURSO' && !requests.some(r => r.requestType === SpecialRequestType.PRORROGA)) {
    types.push(SpecialRequestType.PRORROGA);
  }
  if ((stage === 'EN_CURSO' || stage === 'PRORROGA')
    && !pending(SpecialRequestType.SUSPENSION) && !approved(SpecialRequestType.SUSPENSION)) {
    types.push(SpecialRequestType.SUSPENSION);
  }
  if (stage === 'SUSPENDIDO') types.push(SpecialRequestType.REANUDACION);
  if (!pending(SpecialRequestType.CANCELACION)) types.push(SpecialRequestType.CANCELACION);
  return types;
}
