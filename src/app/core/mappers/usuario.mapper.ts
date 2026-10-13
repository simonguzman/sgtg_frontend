import { CatalogoResponse, TipoDocumentoApi, UsuarioRequest, UsuarioResponse } from '../interfaces/api/auth-api.interface';
import { UserRoleType } from '../enums/user-role-type.enum';
import { User } from '../../modules/users/interfaces/user.interface';
import { CatalogItem } from '../../modules/users/interfaces/catalog-item.interface';
import { IdentificationType } from '../../modules/users/enum/identification-type.enum';
import { UserState } from '../../modules/users/enum/user-state.enum';
import { ContractType } from '../../modules/users/enum/contract-type.enum';

/**
 * Convierte el usuario del backend al modelo `User` de la aplicación.
 * - El id se conserva como texto: el resto de la aplicación compara ids como `string`.
 * - Los roles y el tipo de documento llegan como claves (`JEFE_DEP`, `CC`) y se
 *   traducen a las etiquetas de `UserRoleType` e `IdentificationType`. Un rol
 *   que el front no conoce se descarta.
 * - Nunca incluye la contraseña.
 * - El código y el documento son texto en el backend y número en `User`; un
 *   código no numérico (ej. `ADMIN` del administrador inicial) queda en 0.
 */
export function mapUsuarioToUser(dto: UsuarioResponse): User {
  return {
    id: String(dto.id),
    idType: IdentificationType[dto.tipoDocumento] ?? dto.tipoDocumento,
    idNumber: aNumero(dto.numeroDocumento),
    firstName: dto.primerNombre,
    secondName: dto.segundoNombre ?? '',
    lastName: dto.primerApellido,
    secondLastName: dto.segundoApellido ?? '',
    codeNumber: aNumero(dto.codigo),
    roles: dto.roles
      .map(rol => UserRoleType[rol as keyof typeof UserRoleType])
      .filter((rol): rol is UserRoleType => rol !== undefined),
    email: dto.email,
    state: dto.activo ? UserState.active : UserState.inactive,
    contractType: dto.tipoVinculacion ? ContractType[dto.tipoVinculacion] : null,
    department: aCatalogItem(dto.departamento),
    program: aCatalogItem(dto.programa)
  };
}

/**
 * Vinculación que se registra para el docente según sus roles. El formulario
 * no pregunta el tipo de contrato, así que se deduce:
 * - con rol CODIRECTOR (solo o junto con DIRECTOR): PLANTA, no necesita codirector;
 * - con rol JEFE_DEP: PLANTA, con el departamento que dirige (el backend lo exige
 *   para asignar los evaluadores del anteproyecto);
 * - con rol DIRECTOR sin CODIRECTOR ni JEFE_DEP: OCASIONAL, necesita un codirector de planta;
 * - con otros roles: sin perfil docente (null).
 */
export function contractTypeForRoles(roles: UserRoleType[]): ContractType | null {
  if (roles.includes(UserRoleType.CODIRECTOR) || roles.includes(UserRoleType.JEFE_DEP)) return ContractType.PLANTA;
  if (roles.includes(UserRoleType.DIRECTOR)) return ContractType.OCASIONAL;
  return null;
}

/** @returns true si los roles exigen perfil docente (y por tanto departamento) */
export function requiresDepartment(roles: UserRoleType[]): boolean {
  return contractTypeForRoles(roles) !== null;
}

/** @returns true si los roles exigen perfil de estudiante (y por tanto programa) */
export function requiresProgram(roles: UserRoleType[]): boolean {
  return roles.includes(UserRoleType.ESTUDIANTE);
}

/**
 * Convierte el usuario del formulario al cuerpo que esperan `POST /usuarios`
 * y `PUT /usuarios/{id}`. La vinculación se deduce de los roles
 * ({@link contractTypeForRoles}); el departamento y el programa solo se envían
 * si los roles los requieren.
 */
export function mapUserToUsuarioRequest(user: User): UsuarioRequest {
  const vinculacion = contractTypeForRoles(user.roles);
  return {
    codigo: String(user.codeNumber ?? ''),
    tipoDocumento: aTipoDocumentoApi(user.idType),
    numeroDocumento: String(user.idNumber ?? ''),
    email: user.email,
    password: user.password ?? '',
    primerNombre: user.firstName,
    segundoNombre: vacioANull(user.secondName),
    primerApellido: user.lastName,
    segundoApellido: vacioANull(user.secondLastName),
    roles: user.roles.map(aClaveDeRol),
    tipoVinculacion: vinculacion,
    departamentoId: vinculacion ? user.department?.id ?? null : null,
    programaId: requiresProgram(user.roles) ? user.program?.id ?? null : null
  };
}

/** Clave del backend (ej. `JEFE_DEP`) para la etiqueta de un rol. */
export function aClaveDeRol(rol: UserRoleType): string {
  const clave = (Object.keys(UserRoleType) as (keyof typeof UserRoleType)[]).find(k => UserRoleType[k] === rol);
  return clave ?? rol;
}

/** Acepta la etiqueta (`Cédula de Ciudadanía (CC)`) o la clave (`CC`) del tipo de documento. */
function aTipoDocumentoApi(tipo: IdentificationType | string): TipoDocumentoApi {
  const claves = Object.keys(IdentificationType) as TipoDocumentoApi[];
  return claves.find(clave => clave === tipo || IdentificationType[clave] === tipo) ?? (tipo as TipoDocumentoApi);
}

function aCatalogItem(catalogo: CatalogoResponse | null | undefined): CatalogItem | null {
  return catalogo ? { id: catalogo.id, name: catalogo.nombre } : null;
}

function vacioANull(valor: string | undefined | null): string | null {
  return valor && valor.trim() ? valor : null;
}

function aNumero(valor: string): number {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}
