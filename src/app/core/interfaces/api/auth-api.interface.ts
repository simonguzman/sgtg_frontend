/**
 * Contratos del backend (sgtg_backend) para autenticación y usuarios. Reflejan
 * los DTO de Java tal como llegan por HTTP; el resto de la aplicación trabaja
 * con el modelo `User`, al que se convierten con `mapUsuarioToUser`.
 */

/** Respuesta de `POST /auth/login`. */
export interface LoginResponse {
  token: string;
}

/** Tipos de documento del backend (`TipoDocumentoIdentidad`). */
export type TipoDocumentoApi = 'CC' | 'CE' | 'PASAPORTE';

/** Respuesta de `GET /usuarios/me` y de las operaciones sobre usuarios (`UsuarioDTOResponse`). */
export interface UsuarioResponse {
  id: number;
  codigo: string;
  tipoDocumento: TipoDocumentoApi;
  numeroDocumento: string;
  email: string;
  primerNombre: string;
  segundoNombre: string | null;
  primerApellido: string;
  segundoApellido: string | null;
  /** Claves de los roles (ej. `JEFE_DEP`), iguales a las claves de `UserRoleType` */
  roles: string[];
  activo: boolean;
  /** Perfil docente: vinculación y departamento (null si no tiene) */
  tipoVinculacion: TipoVinculacionApi | null;
  departamento: CatalogoResponse | null;
  /** Perfil de estudiante: programa (null si no tiene) */
  programa: CatalogoResponse | null;
}

/** Vinculación de un docente con la universidad (`TipoVinculacion`). */
export type TipoVinculacionApi = 'PLANTA' | 'OCASIONAL' | 'CATEDRA' | 'ESTUDIANTE_POSGRADO';

/** Elemento de un catálogo (departamentos, programas): `CatalogoDTOResponse`. */
export interface CatalogoResponse {
  id: number;
  nombre: string;
}

/**
 * Programa del catálogo (`ProgramaDTOResponse`): está adscrito a un
 * departamento, cuyo Comité de Programa atiende sus trabajos de grado.
 */
export interface ProgramaResponse extends CatalogoResponse {
  /** null en programas registrados antes de exigir el departamento */
  departamento: CatalogoResponse | null;
}

/**
 * Cuerpo de `POST /usuarios` y `PUT /usuarios/{id}`. Al actualizar, una
 * contraseña vacía conserva la actual. El perfil docente va con
 * `tipoVinculacion` + `departamentoId`; el de estudiante con `programaId`.
 */
export interface UsuarioRequest {
  codigo: string;
  tipoDocumento: TipoDocumentoApi;
  numeroDocumento: string;
  email: string;
  password: string;
  primerNombre: string;
  segundoNombre: string | null;
  primerApellido: string;
  segundoApellido: string | null;
  roles: string[];
  tipoVinculacion: TipoVinculacionApi | null;
  departamentoId: number | null;
  programaId: number | null;
}

/** Cuerpo de `PUT /usuarios/me/password`. */
export interface CambiarPasswordRequest {
  passwordActual: string;
  passwordNueva: string;
}

/** Estructura de error del backend (`Error`): `errorCode` es del tipo `GC-0005`. */
export interface ApiError {
  errorCode: string;
  message: string;
  httpCode: number;
  url?: string;
  method?: string;
}
