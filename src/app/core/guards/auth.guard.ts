import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { UserState } from '../../modules/users/enum/user-state.enum';

export const authGuard: CanActivateFn = ( route, state ) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUser();

  if(authService.isAuthenticated() && user?.state === UserState.active ){
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
