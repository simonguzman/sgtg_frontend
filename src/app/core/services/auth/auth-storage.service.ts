import { computed, Injectable, signal } from '@angular/core';
import { User } from '../../../modules/users/interfaces/user.interface';
import { jwtDebeCambiarPassword } from '../../utils/jwt-utils';

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

  /** Token de acceso vigente, o null sin sesión. */
  public readonly token = this._token.asReadonly();
  /** Usuario autenticado, o null sin sesión. */
  public readonly currentUser = this._currentUser.asReadonly();
  /** true si hay usuario y token de acceso. */
  public readonly isAuthenticated = computed(() => !!this._currentUser() && !!this._token());
  /** Roles del usuario autenticado. */
  public readonly userRoles       = computed(() => this._currentUser()?.roles ?? []);
  /** El usuario debe cambiar la contraseña que le asignó un administrador antes de usar el sistema */
  public readonly debeCambiarPassword = computed(() => {
    const token = this._token();
    return !!token && jwtDebeCambiarPassword(token);
  });

  /** Borra del navegador las claves de sesión de versiones anteriores. */
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

  /** Reemplaza los datos del usuario autenticado (roles, estado o perfil actualizados). */
  public setUser(user: User): void {
    this._currentUser.set(user);
  }

  /** Igual que {@link setUser}: actualiza el usuario de la sesión tras editar su perfil. */
  public updateUser(updatedUser: User): void {
    this.setUser(updatedUser);
  }

  /** Cierra la sesión: elimina el token y el usuario. */
  public clearUser(): void {
    this._token.set(null);
    this._currentUser.set(null);
    localStorage.removeItem(CLAVE_HAY_SESION);
  }

  /** @returns true si en este navegador hay una sesión abierta que recuperar con el token de renovación */
  public haySesionGuardada(): boolean {
    return localStorage.getItem(CLAVE_HAY_SESION) === '1';
  }
}
