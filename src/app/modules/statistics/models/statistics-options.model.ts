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

/** Roles que consultan las estadísticas (consultan todos los trabajos). */
export const STATISTICS_ROLES: UserRoleType[] = [
  UserRoleType.ADMINISTRADOR, UserRoleType.CONSEJO, UserRoleType.COMITE, UserRoleType.JEFE_DEP,
  UserRoleType.DECANATURA
];
