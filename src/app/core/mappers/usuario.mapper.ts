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
    code: dto.codigo,
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
 * Roles que llevan perfil docente (vinculación y departamento), iguales a
 * `ROLES_DOCENTE` del backend. El jefe y el Comité lo necesitan para indicar
 * su departamento: solo atienden los trabajos de ese departamento y de sus
 * programas.
 */
export const ROLES_DOCENTE: readonly UserRoleType[] = [
  UserRoleType.DOCENTE, UserRoleType.DIRECTOR, UserRoleType.CODIRECTOR, UserRoleType.EVALUADOR,
  UserRoleType.JURADO, UserRoleType.JURADO_COORDINADOR, UserRoleType.JEFE_DEP, UserRoleType.COMITE
];

/** @returns true si los roles exigen perfil docente (vinculación y departamento) */
export function requiresTeacherProfile(roles: UserRoleType[]): boolean {
  return roles.some(rol => ROLES_DOCENTE.includes(rol));
}

/** @returns true si los roles exigen perfil de estudiante (y por tanto programa) */
export function requiresProgram(roles: UserRoleType[]): boolean {
  return roles.includes(UserRoleType.ESTUDIANTE);
}

/**
 * Convierte el usuario del formulario al cuerpo que esperan `POST /usuarios`
 * y `PUT /usuarios/{id}`. La vinculación (elegida en el formulario) y el
 * departamento solo se envían con roles de perfil docente; el programa, con
 * el rol de estudiante.
 */
export function mapUserToUsuarioRequest(user: User): UsuarioRequest {
  const docente = requiresTeacherProfile(user.roles);
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
    tipoVinculacion: docente ? user.contractType ?? null : null,
    departamentoId: docente ? user.department?.id ?? null : null,
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
