import { UserRoleType } from "../enums/user-role-type.enum";

/** Rol en el formulario de usuario: si está asignado y si quien edita puede cambiarlo. */
export interface UserRole {
  type: UserRoleType;
  assigned: boolean;
  /** true si quien edita no puede asignarlo ni quitarlo (lo hace el administrador o el sistema) */
  locked?: boolean;
}
