import { UserRoleType } from "../enums/user-role-type.enum";

export interface UserRole {
  type: UserRoleType;
  assigned: boolean;
  /** true si quien edita no puede asignarlo ni quitarlo (lo hace el administrador o el sistema) */
  locked?: boolean;
}
