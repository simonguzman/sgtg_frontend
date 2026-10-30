import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { UserState } from '../../modules/users/enum/user-state.enum';
import { CAMBIO_PASSWORD_URL } from './public.guard';

export const authGuard: CanActivateFn = ( route, state ) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUser();

  if(authService.isAuthenticated() && user?.state === UserState.active ){
    // Con la contraseña que asignó un administrador, primero debe cambiarla
    if (authService.debeCambiarPassword()) {
      router.navigate([CAMBIO_PASSWORD_URL]);
      return false;
    }
    return true;
  }

  if (user && user.state !== UserState.active) {
    console.warn('Sesión bloqueada: El usuario ha sido inhabilitado.');
    authService.logout();
  } else {
    router.navigate(['/auth/login']);
  }

  return false;
};
