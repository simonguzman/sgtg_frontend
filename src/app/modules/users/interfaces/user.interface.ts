import { UserRoleType } from "../../../core/models/user-role";
export enum IdentificationType {
  CC = 'Cédula de Ciudadanía (CC)',
  CE = 'Cédula de Extranjería (CE)',
  PASAPORTE = 'Pasaporte'
}

export enum UserState {
  active = 'Activo',
  inactive = 'Inactivo'
}

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
