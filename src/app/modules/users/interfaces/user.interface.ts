
import { UserRoleType } from "../../../core/enums/user-role-type.enum";
import { IdentificationType } from "../enum/identification-type.enum";
import { UserState } from "../enum/user-state.enum";

export interface User {
  id: string;
  idType: IdentificationType | string;
  idNumber: number;
  firstName: string;
  secondName?: string;
  lastName: string;
  secondLastName: string;
  codeNumber: number;
  roles: UserRoleType[];
  email: string;
  password: string;
  state: UserState
}
