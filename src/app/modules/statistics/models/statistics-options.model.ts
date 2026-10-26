import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { ProjectStage } from '../enum/projectStage.enum';

export interface StageOption {
  label: string;
  value: ProjectStage;
}

export const STAGE_OPTIONS: StageOption[] = [
  { label: 'Propuesta', value: ProjectStage.PROPUESTA },
  { label: 'Anteproyecto', value: ProjectStage.ANTEPROYECTO },
  { label: 'Trabajo de Grado', value: ProjectStage.TRABAJO_GRADO }
];

/** Roles que consultan las estadísticas de toda la facultad (el backend les entrega todos los trabajos). */
const ROLES_DE_TODA_LA_FACULTAD: UserRoleType[] = [UserRoleType.ADMINISTRADOR, UserRoleType.CONSEJO, UserRoleType.DECANATURA];

/**
 * Roles que consultan las estadísticas: todos menos el estudiante (solo tiene
 * su trabajo, que sigue en su sección). Cada uno ve las de los trabajos que el
 * backend le deja consultar: toda la facultad, los programas de su
 * departamento (Comité), los dirigidos en su departamento (jefe) o aquellos en
 * los que participa (director, codirector, asesor, evaluador, jurado).
 */
export const STATISTICS_ROLES: UserRoleType[] = [
  ...ROLES_DE_TODA_LA_FACULTAD, UserRoleType.COMITE, UserRoleType.JEFE_DEP, UserRoleType.DOCENTE,
  UserRoleType.DIRECTOR, UserRoleType.CODIRECTOR, UserRoleType.ASESOR, UserRoleType.EVALUADOR, UserRoleType.JURADO,
  UserRoleType.JURADO_COORDINADOR
];

/** Qué trabajos cuentan las estadísticas del usuario, según sus roles (mismo alcance del backend). */
export function statisticsScope(roles: readonly string[]): string {
  if (ROLES_DE_TODA_LA_FACULTAD.some(rol => roles.includes(rol))) return 'Todos los trabajos de grado de la facultad.';
  const alcances: string[] = [];
  if (roles.includes(UserRoleType.COMITE)) alcances.push('los de los programas de su departamento');
  if (roles.includes(UserRoleType.JEFE_DEP)) alcances.push('los dirigidos por docentes de su departamento');
  alcances.push('aquellos en los que participa (como director, codirector, asesor, evaluador o jurado)');
  const lista = alcances.length > 1
    ? `${alcances.slice(0, -1).join(', ')} y ${alcances[alcances.length - 1]}`
    : alcances[0];
  return `Trabajos de grado que puede consultar: ${lista}.`;
}
