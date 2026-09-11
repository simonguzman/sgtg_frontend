import { inject, Injector } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { ThesisWorkStorageService } from '../../modules/thesis-work/services/thesis-work-storage.service';
import { NotificationService } from '../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../shared/components/notifications/models/notification.model';
import { resolveEntityForGuard } from '../helpers/resolve-entity-for-guard.helper';

/**
 * Mismo criterio, aplicado a Trabajo de Grado. El hueco más amplio de los
 * 3: evaluate_advance permite [DIRECTOR, CODIRECTOR, ASESOR] de forma
 * genérica — sin este guard, cualquier director podía evaluar el avance
 * de un estudiante que no dirige.
 */
export const thesisWorkOwnershipGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const thesisStorage = inject(ThesisWorkStorageService);
  const notificationService = inject(NotificationService);
  const injector = inject(Injector);

  const id = route.paramMap.get('id');
  const currentUser = authService.currentUser();
  if (!id || !currentUser) return true;

  return resolveEntityForGuard(
    thesisStorage.isHydrated,
    () => thesisStorage.allThesisWorks(),
    work => work.thesisWorkId === id,
    injector
  ).then(work => {
    if (!work) return true;
    if (thesisStorage.canUserViewThesisWork(work, currentUser.id)) return true;

    notificationService.show({
      title: 'Acceso restringido',
      message: 'No tienes ninguna relación registrada con este trabajo de grado.',
      type: NotificationType.ERROR
    });
    return router.createUrlTree(['/thesis-work']);
  });
};
