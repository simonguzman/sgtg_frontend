import { UserRoleType } from "../../../core/enums/user-role-type.enum";
import { IdentificationType } from "../enum/identification-type.enum";
import { UserState } from "../enum/user-state.enum";
import { ContractType } from "../enum/contract-type.enum";
import { CatalogItem } from "./catalog-item.interface";

export interface User {
  id: string;
  idType: IdentificationType | string;
  idNumber: number;
  firstName: string;
  secondName?: string;
  lastName: string;
  secondLastName: string;
  codeNumber: number;
  /** Código tal como lo guarda el backend (puede no ser numérico, ej. `ADMIN`); es el que se muestra */
  code?: string;
  roles: UserRoleType[];
  email: string;
  /** Solo se usa al crear o editar un usuario; la sesión nunca la guarda */
  password?: string;
  state: UserState;
  /** Perfil docente: vinculación con la universidad (se elige en el formulario) */
  contractType?: ContractType | null;
  /** Perfil docente: departamento al que está adscrito */
  department?: CatalogItem | null;
  /** Perfil de estudiante: programa académico */
  program?: CatalogItem | null;
}
