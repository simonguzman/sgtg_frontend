import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { User } from '../interfaces/user.interface';

/**
 * Roles que gestionan usuarios. El backend limita lo que hace cada uno: el
 * administrador gestiona a todos; Consejo y Decanatura, a toda la facultad; el
 * Comité y el jefe de departamento, a los docentes de su departamento y a los
 * estudiantes de sus programas.
 */
export const ROLES_GESTORES_DE_USUARIOS: readonly UserRoleType[] = [
  UserRoleType.ADMINISTRADOR, UserRoleType.COMITE, UserRoleType.JEFE_DEP, UserRoleType.CONSEJO,
  UserRoleType.DECANATURA
];

/** Únicos roles que asigna o quita un gestor que no es el administrador. */
export const ROLES_ASIGNABLES_POR_GESTORES: readonly UserRoleType[] = [UserRoleType.ESTUDIANTE, UserRoleType.DOCENTE];

/** Gestores que, sin ser administradores, gestionan a toda la facultad. */
const GESTORES_DE_LA_FACULTAD: readonly UserRoleType[] = [UserRoleType.CONSEJO, UserRoleType.DECANATURA];

/**
 * Usuario de la gestión de usuarios (`GET /usuarios/gestion`). A los usuarios
 * con roles administrativos solo los modifica el administrador.
 */
export interface ManagedUser {
  user: User;
  /** true si el gestor puede editarlo, cambiar sus roles o activarlo e inactivarlo */
  editable: boolean;
}

export function esAdministrador(gestor: User | null | undefined): boolean {
  return !!gestor?.roles?.includes(UserRoleType.ADMINISTRADOR);
}

/**
 * Departamento al que se limita el gestor en el formulario (el del Comité o
 * del jefe de departamento); null si gestiona toda la facultad.
 */
export function departamentoDelGestor(gestor: User | null | undefined): number | null {
  const roles = gestor?.roles ?? [];
  if (esAdministrador(gestor) || GESTORES_DE_LA_FACULTAD.some(rol => roles.includes(rol))) return null;
  return gestor?.department?.id ?? null;
}

/** ¿El gestor puede asignar o quitar el rol? El administrador, todos; los demás, Estudiante y Docente. */
export function puedeAsignarRol(gestor: User | null | undefined, rol: UserRoleType): boolean {
  return esAdministrador(gestor) || ROLES_ASIGNABLES_POR_GESTORES.includes(rol);
}
