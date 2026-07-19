import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { delay, map, Observable, of, throwError } from 'rxjs';
import { UserService } from '../../../modules/users/services/user.service';
import { Router } from '@angular/router';
import { User } from '../../../modules/users/interfaces/user.interface';
import { UserState } from '../../../modules/users/enum/user-state.enum';
import { ChangePasswordResponse } from '../../interfaces/change-password-response.interface';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly userService = inject(UserService);
  private readonly router      = inject(Router);
  private readonly http        = inject(HttpClient);

  private readonly AUTH_KEY = 'sgtg_session';

  /**
   * ESTADO DE AUTENTICACIÓN
   * Usamos Signals para una reactividad eficiente en toda la app.
   */
  private readonly _currentUser = signal<User | null>(this.getStoredSession());

  // Exponemos el usuario como readonly para proteger el estado
  public currentUser = this._currentUser.asReadonly();

  /**
   * isAuthenticated:
   * Se actualiza automáticamente cada vez que _currentUser cambia.
   */
  public isAuthenticated = computed(() => !!this._currentUser());

  /**
   * hasRole:
   * Un helper computado que podrías usar en el futuro para chequeos rápidos.
   */
  public userRoles = computed(() => this._currentUser()?.roles || []);

  constructor() {}

  private getStoredSession(): User | null {
    const stored = localStorage.getItem(this.AUTH_KEY);
    if (!stored) return null;

    try {
      return JSON.parse(stored);
    } catch (error) {
      localStorage.removeItem(this.AUTH_KEY);
      return null;
    }
  }

  login(credentials: { email: string, password: string }): Observable<{ success: boolean; message?: string }> {
  // 1. Buscamos el usuario por credenciales
  const user = this.userService.users().find(
    u => u.email === credentials.email && u.password === credentials.password
  );

  return of(user).pipe(
    delay(1000),
    map(user => {
      // Caso A: No existe el usuario
      if (!user) {
        return { success: false, message: 'Correo o contraseña incorrectos.' };
      }

      // Caso B: El usuario existe pero está inactivo
      // Asegúrate de importar UserState de tu interfaz
      if (user.state !== UserState.active) { // O UserState.active dependiendo de tu enum
        return { success: false, message: 'Tu cuenta se encuentra inhabilitada. Contacta al administrador.' };
      }

      // Caso C: Todo OK
      this._currentUser.set(user);
      localStorage.setItem(this.AUTH_KEY, JSON.stringify(user));
      return { success: true };
    })
  );
}

  logout(): void {
    this._currentUser.set(null);
    localStorage.removeItem(this.AUTH_KEY);
    this.router.navigate(['/auth/login']);
  }

  changePassword(currentPassword: string, newPassword: string): Observable<ChangePasswordResponse> {
    const user = this.currentUser();

    if (!user || user.password !== currentPassword) {
      return throwError(() => new Error('La contraseña actual es incorrecta.'));
    }

    const updatedUser = { ...user, password: newPassword };

    // Sincronización de señales y storage
    this._currentUser.set(updatedUser);
    localStorage.setItem(this.AUTH_KEY, JSON.stringify(updatedUser));

    // Sincronización con la "BD" global
    this.userService.updateUserPasswordMock(user.id, newPassword);

    return of({
      success: true,
      message: 'Contraseña actualizada exitosamente.'
    }).pipe(delay(1500));
  }

  /**
   * Método de utilidad para verificar roles específicos
   */
  hasAnyRole(requiredRoles: string[]): boolean {
    const user = this._currentUser();
    if (!user) return false;
    return user.roles.some(role => requiredRoles.includes(role));
  }

}
