import { inject } from '@angular/core';
import { CanActivateFn, Router, } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';

/** Pantalla en la que se cambia la contraseña asignada por un administrador */
export const CAMBIO_PASSWORD_URL = '/auth/cambiar-password';

/**
 * Rutas de autenticación (login): solo para visitantes sin sesión. La pantalla
 * de cambio obligatorio de contraseña es la excepción: solo para quien inició
 * sesión con una contraseña asignada y todavía no la cambia.
 */
export const publicGuard: CanActivateFn = ( route, state ) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const esCambioPassword = state.url.startsWith(CAMBIO_PASSWORD_URL);

  if(authService.isAuthenticated()){
    if (authService.debeCambiarPassword()) {
      if (esCambioPassword) return true;
      router.navigate([CAMBIO_PASSWORD_URL]);
      return false;
    }
    router.navigate(['/notifications']);
    return false;
  }
  if (esCambioPassword) {
    router.navigate(['/auth/login']);
    return false;
  }
  return true;
};
