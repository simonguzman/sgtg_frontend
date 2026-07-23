import { inject, Injectable } from '@angular/core';
import { delay, map, Observable, of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthStorageService } from './auth-storage.service';
import { UserService } from '../../../modules/users/services/user.service';
import { UserState } from '../../../modules/users/enum/user-state.enum';
import { ChangePasswordResponse } from '../../interfaces/change-password-response.interface';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly storage     = inject(AuthStorageService);
  private readonly userService = inject(UserService);
  private readonly router      = inject(Router);

  login(credentials: { email: string; password: string }): Observable<{ success: boolean; message?: string }> {
    const found = this.userService.users().find(
      u => u.email === credentials.email && u.password === credentials.password
    );

    return of(found).pipe(
      delay(1000),
      map(user => {
        if (!user) {
          return { success: false, message: 'Correo o contraseña incorrectos.' };
        }
        if (user.state !== UserState.active) {
          return { success: false, message: 'Tu cuenta se encuentra inhabilitada. Contacta al administrador.' };
        }
        this.storage.setUser(user);
        return { success: true };
      })
    );
  }

  logout(): void {
    this.storage.clearUser();
    this.router.navigate(['/auth/login']);
  }

  changePassword(currentPassword: string, newPassword: string): Observable<ChangePasswordResponse> {
    const user = this.storage.currentUser();

    // S6582: La comprobación !user || user.password !== ... se simplifica con
    // encadenamiento opcional. Si user es null, user?.password es undefined,
    // que siempre difiere de un string de contraseña → se dispara throwError.
    if (user?.password !== currentPassword) {
      return throwError(() => new Error('La contraseña actual es incorrecta.'));
    }

    // En este punto user es garantizadamente no-nulo: si fuera null,
    // user?.password sería undefined y habría diferido de currentPassword
    // (string), retornando el error arriba. TypeScript no infiere
    // automáticamente el narrowing tras optional chain, de ahí el uso de !.
    const updatedUser = { ...user!, password: newPassword };
    this.storage.updateUser(updatedUser);
    this.userService.updateUserPasswordMock(user!.id, newPassword);

    return of({ success: true, message: 'Contraseña actualizada exitosamente.' })
      .pipe(delay(1500));
  }
}
