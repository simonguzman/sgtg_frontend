import { effect, inject, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, Observable, of } from 'rxjs';
import { AuthStorageService } from './auth-storage.service';
import { AuthApiService } from './auth-api.service';
import { MINUTOS_INACTIVIDAD, SessionInactivityService } from './session-inactivity.service';
import { ChangePasswordResponse } from '../../interfaces/change-password-response.interface';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';
import { jwtExpiration } from '../../utils/jwt-utils';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storage      = inject(AuthStorageService);
  private readonly api          = inject(AuthApiService);
  private readonly router       = inject(Router);
  private readonly notification = inject(NotificationService);
  private readonly inactividad  = inject(SessionInactivityService);

  // ── Estado reactivo ────────────────────────────────────────────────────────
  // La misma API pública que antes: cualquier componente o servicio que usaba
  // authService.currentUser(), authService.isAuthenticated(), etc. sigue
  // funcionando sin cambios.
  readonly currentUser     = this.storage.currentUser;
  readonly isAuthenticated = this.storage.isAuthenticated;
  readonly userRoles       = this.storage.userRoles;

  constructor() {
    // Cierra la sesión cuando vence el token, aunque el usuario no haga peticiones
    effect(onCleanup => {
      const token = this.storage.token();
      const vencimiento = token ? jwtExpiration(token) : null;
      if (vencimiento === null) return;
      const temporizador = setTimeout(() => this.expireSession(), Math.max(vencimiento - Date.now(), 0));
      onCleanup(() => clearTimeout(temporizador));
    });

    // Cierra la sesión tras un tiempo sin actividad del usuario
    effect(() => {
      if (this.storage.isAuthenticated()) this.inactividad.iniciar(() => this.cerrarPorInactividad());
      else this.inactividad.detener();
    });
  }

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

  /**
   * Al arrancar la aplicación: si hay una sesión guardada, refresca el usuario
   * desde el backend (sus roles o su estado pudieron cambiar). Si el backend
   * responde 401, el interceptor ya cerró la sesión; ante un error de conexión
   * se conserva la sesión guardada.
   */
  initialize(): Observable<unknown> {
    if (!this.storage.isAuthenticated()) return of(undefined);
    return this.api.refreshCurrentUser().pipe(
      catchError((error: HttpErrorResponse) => {
        console.warn('No se pudo refrescar el usuario de la sesión', error.status);
        return of(undefined);
      })
    );
  }

  /**
   * Termina una sesión que el backend ya no acepta (token vencido o usuario
   * inactivado): limpia la sesión, avisa al usuario y lo lleva al login.
   */
  expireSession(): void {
    if (!this.storage.isAuthenticated()) return;
    this.storage.clearUser();
    this.notification.security('Sesión finalizada', 'Tu sesión expiró. Inicia sesión de nuevo para continuar.');
    this.router.navigate(['/auth/login']);
  }

  /** Cierra la sesión (también en el backend, con el motivo) y avisa por qué. */
  private cerrarPorInactividad(): void {
    if (!this.storage.isAuthenticated()) return;
    this.api.logout('inactividad');
    this.notification.security('Sesión cerrada por inactividad',
      `Tu sesión se cerró tras ${MINUTOS_INACTIVIDAD} minutos sin actividad. Inicia sesión de nuevo para continuar.`);
  }

  // ── Utilidad de roles ──────────────────────────────────────────────────────
  // Queda en el facade porque es una consulta derivada del estado de sesión
  // que los guards y componentes llaman directamente sobre AuthService.
  hasAnyRole(requiredRoles: string[]): boolean {
    return this.storage.currentUser()?.roles.some(role => requiredRoles.includes(role)) ?? false;
  }
}
