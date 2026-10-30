import { computed, Injectable, signal } from '@angular/core';
import { User } from '../../../modules/users/interfaces/user.interface';
import { isJwtVigente, jwtDebeCambiarPassword } from '../../utils/jwt-utils';

/**
 * Sesión del usuario autenticado: el token JWT del backend y los datos del
 * usuario (de `GET /usuarios/me`), guardados en localStorage. Es la única
 * fuente de la sesión en la aplicación.
 */
@Injectable({ providedIn: 'root' })
export class AuthStorageService {
  private readonly AUTH_KEY = 'sgtg_session';
  private readonly TOKEN_KEY = 'sgtg_token';

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
    this.restoreSession();
  }

  /** Inicia la sesión con el token del login y el usuario autenticado. */
  public setSession(token: string, user: User): void {
    this._token.set(token);
    localStorage.setItem(this.TOKEN_KEY, token);
    this.setUser(user);
  }

  /** Reemplaza el token de la sesión (el backend emite uno nuevo al cambiar la contraseña). */
  public setToken(token: string): void {
    this._token.set(token);
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  public setUser(user: User): void {
    this._currentUser.set(user);
    localStorage.setItem(this.AUTH_KEY, JSON.stringify(user));
  }

  public updateUser(updatedUser: User): void {
    this.setUser(updatedUser);
  }

  /** Cierra la sesión: elimina el token y el usuario. */
  public clearUser(): void {
    this._token.set(null);
    this._currentUser.set(null);
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.AUTH_KEY);
  }

  /** @returns true si hay token y todavía no ha vencido */
  public hasValidToken(): boolean {
    const token = this._token();
    return !!token && isJwtVigente(token);
  }

  /**
   * Recupera la sesión guardada solo si el token sigue vigente. Una sesión sin
   * token (formato anterior, simulado) o vencida se descarta.
   */
  private restoreSession(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const user = this.getStoredUser();
    if (!token || !user || !isJwtVigente(token)) {
      this.clearUser();
      return;
    }
    this._token.set(token);
    this._currentUser.set(user);
  }

  private getStoredUser(): User | null {
    const stored = localStorage.getItem(this.AUTH_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as User;
    } catch {
      // S2486: Se elimina el binding del error porque no se usa ni se relanza.
      // La sesión corrupta se limpia del storage para evitar bucles de error.
      return null;
    }
  }
}
