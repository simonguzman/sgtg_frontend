import { UserRoleType } from '../../../../enums/user-role-type.enum';

export interface SidebarMenuItem {
  label: string;
  icon: string;
  routerLink: string;
  roles?: UserRoleType[];
}

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
    roles: [UserRoleType.ADMINISTRADOR]
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
      UserRoleType.DECANATURA, UserRoleType.JURADO, UserRoleType.ADMINISTRADOR, UserRoleType.CONSEJO
    ]
  },
  {
    label: 'Estadísticas',
    routerLink: '/statistics',
    icon: 'bar_chart',
    roles: [UserRoleType.ADMINISTRADOR, UserRoleType.CONSEJO]
  },
  {
    label: 'Historial',
    routerLink: '/history',
    icon: 'history'
  }
];
