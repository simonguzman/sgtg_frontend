import { computed, Injectable, signal } from '@angular/core';
import { User } from '../../../modules/users/interfaces/user.interface';
import { isJwtVigente, jwtDebeCambiarPassword } from '../../utils/jwt-utils';

/** Marca de que hay una sesión abierta en este navegador, para intentar recuperarla al recargar. */
export const CLAVE_HAY_SESION = 'sgtg_hay_sesion';
/** Claves con que se guardaba la sesión antes (el token en localStorage): se borran al arrancar. */
const CLAVES_ANTERIORES = ['sgtg_token', 'sgtg_session'];

/**
 * Sesión del usuario autenticado: el token de acceso del backend y los datos
 * del usuario (de `GET /usuarios/me`). Es la única fuente de la sesión en la
 * aplicación.
 *
 * El token de acceso dura poco y vive solo en memoria: ningún script puede
 * leerlo de localStorage. Al recargar la página la sesión se recupera con el
 * token de renovación, que el backend guarda en una cookie HttpOnly (ver
 * `AuthApiService.renovar`); en localStorage solo queda la marca de que hay
 * una sesión que recuperar.
 */
@Injectable({ providedIn: 'root' })
export class AuthStorageService {
  private readonly _token = signal<string | null>(null);
  private readonly _currentUser = signal<User | null>(null);

  public readonly token = this._token.asReadonly();
  public readonly currentUser = this._currentUser.asReadonly();

  // Se mueven aquí porque dependen exclusivamente del signal de sesión —
  // no hay lógica de negocio, solo derivación reactiva del estado almacenado.
  public readonly isAuthenticated = computed(() => !!this._currentUser() && !!this._token());
  public readonly userRoles       = computed(() => this._currentUser()?.roles ?? []);
  /** El usuario debe cambiar la contraseña que le asignó un administrador antes de usar el sistema */
  public readonly debeCambiarPassword = computed(() => {
    const token = this._token();
    return !!token && jwtDebeCambiarPassword(token);
  });

  constructor() {
    CLAVES_ANTERIORES.forEach(clave => localStorage.removeItem(clave));
  }

  /** Inicia la sesión con el token del login y el usuario autenticado. */
  public setSession(token: string, user: User): void {
    this._token.set(token);
    this._currentUser.set(user);
    localStorage.setItem(CLAVE_HAY_SESION, '1');
  }

  /** Reemplaza el token de acceso (al renovar la sesión o al cambiar la contraseña). */
  public setToken(token: string): void {
    this._token.set(token);
  }

  public setUser(user: User): void {
    this._currentUser.set(user);
  }

  public updateUser(updatedUser: User): void {
    this.setUser(updatedUser);
  }

  /** Cierra la sesión: elimina el token y el usuario. */
  public clearUser(): void {
    this._token.set(null);
    this._currentUser.set(null);
    localStorage.removeItem(CLAVE_HAY_SESION);
  }

  /** @returns true si hay token y todavía no ha vencido */
  public hasValidToken(): boolean {
    const token = this._token();
    return !!token && isJwtVigente(token);
  }

  /** @returns true si en este navegador hay una sesión abierta que recuperar con el token de renovación */
  public haySesionGuardada(): boolean {
    return localStorage.getItem(CLAVE_HAY_SESION) === '1';
  }
}
