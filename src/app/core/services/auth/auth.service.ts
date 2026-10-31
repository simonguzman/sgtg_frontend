import { effect, inject, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, finalize, Observable, of, shareReplay, tap } from 'rxjs';
import { AuthStorageService } from './auth-storage.service';
import { AuthApiService, ResultadoRenovacion } from './auth-api.service';
import { MINUTOS_INACTIVIDAD, SessionInactivityService } from './session-inactivity.service';
import { ChangePasswordResponse } from '../../interfaces/change-password-response.interface';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';
import { jwtExpiration } from '../../utils/jwt-utils';

/** Cuánto antes de que venza el token de acceso se renueva la sesión. */
export const RENOVAR_ANTES_MS = 60_000;

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
  /** Debe cambiar la contraseña que le asignó un administrador antes de usar el sistema */
  readonly debeCambiarPassword = this.storage.debeCambiarPassword;

  /** Renovación en curso: las peticiones que la piden a la vez esperan la misma */
  private renovacion?: Observable<ResultadoRenovacion>;

  constructor() {
    // El token de acceso dura poco: la sesión se renueva un poco antes de que venza. Mientras la
    // pestaña esté abierta sigue viva; tras un tiempo sin actividad la cierra el control de inactividad
    effect(onCleanup => {
      const token = this.storage.token();
      const vencimiento = token ? jwtExpiration(token) : null;
      if (vencimiento === null) return;
      const temporizador = setTimeout(() => this.renovarSesion().subscribe({
        next: resultado => { if (resultado === 'vencida') this.expireSession(); },
        // Sin conexión: la próxima petición vuelve a intentarlo
        error: () => undefined
      }), Math.max(vencimiento - RENOVAR_ANTES_MS - Date.now(), 0));
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
   * Al arrancar la aplicación: si en este navegador había una sesión abierta,
   * la recupera con el token de renovación de la cookie (token de acceso nuevo
   * y el usuario con sus roles y estado al día). Si ya venció, la sesión queda
   * cerrada; ante un error de conexión se intenta en la siguiente petición.
   */
  initialize(): Observable<unknown> {
    if (this.storage.isAuthenticated()) {
      return this.api.refreshCurrentUser().pipe(
        catchError((error: HttpErrorResponse) => {
          console.warn('No se pudo refrescar el usuario de la sesión', error.status);
          return of(undefined);
        })
      );
    }
    if (!this.storage.haySesionGuardada()) return of(undefined);
    return this.renovarSesion().pipe(
      tap(resultado => { if (resultado === 'vencida') this.storage.clearUser(); }),
      catchError((error: HttpErrorResponse) => {
        console.warn('No se pudo recuperar la sesión', error.status);
        return of(undefined);
      })
    );
  }

  /**
   * Renueva la sesión con el token de renovación (cookie HttpOnly). Si varias
   * peticiones la piden a la vez, comparten la misma renovación: el backend
   * rota el token en cada uso.
   */
  renovarSesion(): Observable<ResultadoRenovacion> {
    if (!this.renovacion) {
      this.renovacion = this.api.renovar().pipe(
        finalize(() => this.renovacion = undefined),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.renovacion;
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

  /**
   * El backend rechazó una operación porque el usuario debe cambiar primero la
   * contraseña que le asignaron: lo lleva a cambiarla.
   */
  requirePasswordChange(): void {
    this.router.navigate(['/auth/cambiar-password']);
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
