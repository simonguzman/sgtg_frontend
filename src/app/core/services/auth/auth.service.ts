import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthStorageService } from './auth-storage.service';
import { AuthApiService } from './auth-api.service';
import { ChangePasswordResponse } from '../../interfaces/change-password-response.interface';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storage = inject(AuthStorageService);
  private readonly api     = inject(AuthApiService);

  // ── Estado reactivo ────────────────────────────────────────────────────────
  // La misma API pública que antes: cualquier componente o servicio que usaba
  // authService.currentUser(), authService.isAuthenticated(), etc. sigue
  // funcionando sin cambios.
  readonly currentUser     = this.storage.currentUser;
  readonly isAuthenticated = this.storage.isAuthenticated;
  readonly userRoles       = this.storage.userRoles;

  // ── Operaciones de autenticación ───────────────────────────────────────────
  login(credentials: { email: string; password: string }): Observable<{ success: boolean; message?: string }> {
    return this.api.login(credentials);
  }

  logout(): void {
    this.api.logout();
  }

  changePassword(currentPassword: string, newPassword: string): Observable<ChangePasswordResponse> {
    return this.api.changePassword(currentPassword, newPassword);
  }

  // ── Utilidad de roles ──────────────────────────────────────────────────────
  // Queda en el facade porque es una consulta derivada del estado de sesión
  // que los guards y componentes llaman directamente sobre AuthService.
  hasAnyRole(requiredRoles: string[]): boolean {
    return this.storage.currentUser()?.roles.some(role => requiredRoles.includes(role)) ?? false;
  }
}
