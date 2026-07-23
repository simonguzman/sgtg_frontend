import { computed, Injectable, signal } from '@angular/core';
import { User } from '../../../modules/users/interfaces/user.interface';

@Injectable({ providedIn: 'root' })
export class AuthStorageService {
  private readonly AUTH_KEY = 'sgtg_session';

  private readonly _currentUser = signal<User | null>(this.getStoredSession());
  public readonly currentUser    = this._currentUser.asReadonly();

  // Se mueven aquí porque dependen exclusivamente del signal de sesión —
  // no hay lógica de negocio, solo derivación reactiva del estado almacenado.
  public readonly isAuthenticated = computed(() => !!this._currentUser());
  public readonly userRoles       = computed(() => this._currentUser()?.roles ?? []);

  public setUser(user: User): void {
    this._currentUser.set(user);
    localStorage.setItem(this.AUTH_KEY, JSON.stringify(user));
  }

  public updateUser(updatedUser: User): void {
    this._currentUser.set(updatedUser);
    localStorage.setItem(this.AUTH_KEY, JSON.stringify(updatedUser));
  }

  public clearUser(): void {
    this._currentUser.set(null);
    localStorage.removeItem(this.AUTH_KEY);
  }

  private getStoredSession(): User | null {
    const stored = localStorage.getItem(this.AUTH_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as User;
    } catch {
      // S2486: Se elimina el binding del error porque no se usa ni se relanza.
      // La sesión corrupta se limpia del storage para evitar bucles de error.
      localStorage.removeItem(this.AUTH_KEY);
      return null;
    }
  }
}
