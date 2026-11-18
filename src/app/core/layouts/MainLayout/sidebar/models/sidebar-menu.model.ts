import { UserRoleType } from '../../../../enums/user-role-type.enum';
import { STATISTICS_ROLES } from '../../../../../modules/statistics/models/statistics-options.model';
import { ROLES_GESTORES_DE_USUARIOS } from '../../../../../modules/users/helpers/user-management.helper';

/**
 * Opción del menú lateral: texto, icono de Material Symbols, ruta y roles que la ven (sin roles, la ven
 * todos).
 */
export interface SidebarMenuItem {
  label: string;
  icon: string;
  routerLink: string;
  roles?: UserRoleType[];
}

/** Opciones del menú lateral en el orden en que se muestran. */
export const SIDEBAR_MENU_ITEMS: SidebarMenuItem[] = [
  {
    label: 'Bandeja de entrada',
    routerLink: '/notifications',
    icon: 'inbox'
  },
  {
    label: 'Usuarios',
    routerLink: '/users',
    icon: 'group',
    roles: [...ROLES_GESTORES_DE_USUARIOS]
  },
  {
    label: 'Propuesta',
    routerLink: '/proposal',
    icon: 'article',
    roles: [
      UserRoleType.ESTUDIANTE, UserRoleType.DIRECTOR, UserRoleType.CODIRECTOR,
      UserRoleType.ASESOR, UserRoleType.JEFE_DEP, UserRoleType.ADMINISTRADOR, UserRoleType.COMITE
    ]
  },
  {
    label: 'Anteproyecto',
    routerLink: '/preliminary-draft',
    icon: 'note_alt',
    roles: [
      UserRoleType.ESTUDIANTE, UserRoleType.DIRECTOR, UserRoleType.CODIRECTOR, UserRoleType.ASESOR,
      UserRoleType.JEFE_DEP, UserRoleType.EVALUADOR, UserRoleType.ADMINISTRADOR, UserRoleType.CONSEJO
    ]
  },
  {
    label: 'Trabajo de grado',
    routerLink: '/thesis-work',
    icon: 'school',
    roles: [
      UserRoleType.ESTUDIANTE, UserRoleType.DIRECTOR, UserRoleType.CODIRECTOR, UserRoleType.ASESOR,
      UserRoleType.DECANATURA, UserRoleType.JURADO, UserRoleType.ADMINISTRADOR, UserRoleType.CONSEJO,
      UserRoleType.COMITE
    ]
  },
  {
    label: 'Estadísticas',
    routerLink: '/statistics',
    icon: 'bar_chart',
    roles: STATISTICS_ROLES
  },
  {
    label: 'Historial',
    routerLink: '/history',
    icon: 'history'
  }
];
