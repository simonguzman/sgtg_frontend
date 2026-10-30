import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { User } from '../interfaces/user.interface';

/** Roles con los que se puede evaluar un anteproyecto o ser jurado (como `Evaluador` en el backend). */
export const ROLES_EVALUADOR: readonly UserRoleType[] = [
  UserRoleType.DOCENTE, UserRoleType.EVALUADOR, UserRoleType.JURADO, UserRoleType.JURADO_COORDINADOR
];

/**
 * Roles que deciden sobre el trabajo y por eso no evalúan el anteproyecto ni son
 * jurados. El jefe de departamento sí puede serlo.
 */
export const ROLES_DECISORES: readonly UserRoleType[] = [
  UserRoleType.COMITE, UserRoleType.CONSEJO, UserRoleType.DECANATURA
];

/**
 * ¿Puede el usuario evaluar el anteproyecto o ser jurado del trabajo? Debe ser
 * docente del departamento del director (el que asigna los evaluadores), sin
 * rol de Comité, Consejo ni Decanatura, y no participar ya en el trabajo. Es la misma regla que valida el backend.
 *
 * @param departmentId departamento del director del trabajo
 * @param excludedIds  participantes del trabajo (y lo que cada formulario excluya)
 */
export function canEvaluateWork(user: User, departmentId: number | null | undefined,
  excludedIds: ReadonlySet<string>): boolean {
  const roles = user.roles ?? [];
  return roles.some(role => ROLES_EVALUADOR.includes(role))
    && !roles.some(role => ROLES_DECISORES.includes(role))
    && departmentId !== null && departmentId !== undefined
    && user.department?.id === departmentId
    && !excludedIds.has(user.id);
}
