import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { UserRoleType } from '../enums/user-role-type.enum';

export const roleGuard: CanActivateFn = ( route, state ) => {
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
