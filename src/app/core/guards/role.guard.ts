import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { UserRoleType } from '../enums/user-role-type.enum';

/**
 * Deja pasar solo a los usuarios con alguno de los roles de `data.roles` de la ruta; a los demás los lleva a
 * su bandeja de entrada.
 */
export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = route.data['roles'] as UserRoleType[];

  if(authService.isAuthenticated() && authService.hasAnyRole(allowedRoles)){
    return true;
  }

  console.warn('Acceso denegado: No tienes los roles necesarios.');
  router.navigate(['/notifications']);
  return false;
};
