import { inject, Injector } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { TrabajoGradoStoreService } from '../services/trabajo-grado/trabajo-grado-store.service';
import { NotificationService } from '../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../shared/components/notifications/models/notification.model';
import { resolveEntityForGuard } from '../helpers/resolve-entity-for-guard.helper';
import { puedeVerArchivado, ROLES_HISTORIAL_GENERAL } from '../../modules/history/helpers/archived-work.helper';
import { yaEvaluo } from '../helpers/evaluacion-pendiente.helper';

/**
 * Detalle de un trabajo del historial: solo si está archivado y el usuario
 * tiene acceso general o fue estudiante, director, codirector o asesor. El
 * evaluador entra al anteproyecto que ya evaluó.
 */
export const archivedWorkGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const store = inject(TrabajoGradoStoreService);
  const notificationService = inject(NotificationService);
  const injector = inject(Injector);

  const id = route.paramMap.get('id');
  const currentUser = authService.currentUser();
  if (!id || !currentUser) return router.createUrlTree(['/history']);

  return resolveEntityForGuard(store.cargado, () => store.trabajos(), trabajo => String(trabajo.id) === id, injector)
    .then(trabajo => {
      const accesoGeneral = authService.hasAnyRole([...ROLES_HISTORIAL_GENERAL]);
      if (trabajo && puedeVerArchivado(trabajo, currentUser.id, accesoGeneral)) return true;
      const enAnteproyecto = route.routeConfig?.path?.startsWith('preliminary-draft-details') ?? false;
      if (trabajo && enAnteproyecto && yaEvaluo(trabajo, currentUser.id)) return true;

      notificationService.show({
        title: 'Acceso restringido',
        message: 'El trabajo no está en tu historial.',
        type: NotificationType.ERROR
      });
      return router.createUrlTree(['/history']);
    });
};
