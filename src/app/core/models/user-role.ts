import { UserRoleType } from "../enums/user-role-type.enum";

export interface UserRole {
  type: UserRoleType;
  assigned: boolean;
}
