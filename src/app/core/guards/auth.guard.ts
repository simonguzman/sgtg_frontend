import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { UserState } from '../../modules/users/enum/user-state.enum';
import { CAMBIO_PASSWORD_URL } from './public.guard';

/**
 * Rutas internas: deja pasar al usuario con sesión y activo. Si debe cambiar la contraseña que le asignó un
 * administrador, lo lleva a cambiarla; si fue inactivado, cierra la sesión, y sin sesión lo lleva al inicio
 * de sesión.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUser();

  if(authService.isAuthenticated() && user?.state === UserState.active ){
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
