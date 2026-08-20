import { UserRoleType } from '../../../../enums/user-role-type.enum';

export interface SidebarMenuItem {
  label: string;
  icon: string;
  routerLink: string;
  /**
   * Roles permitidos para ver este ítem. Si se omite, el ítem es visible
   * para cualquier usuario autenticado, sin importar su rol — usado para
   * secciones personales como la bandeja de entrada o el historial, que
   * no están ligadas a un rol específico. Evita tener que enumerar
   * manualmente los 12 valores de UserRoleType (y mantener esa lista
   * sincronizada cada vez que se agregue un rol nuevo al enum).
   */
  roles?: UserRoleType[];
}

export const SIDEBAR_MENU_ITEMS: SidebarMenuItem[] = [
  {
    label: 'Bandeja de entrada',
    routerLink: '/notifications',
    icon: 'inbox'
    // Sin roles: visible para cualquier usuario con sesión activa.
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
    // Sin roles: visible para cualquier usuario con sesión activa.
  }
];
