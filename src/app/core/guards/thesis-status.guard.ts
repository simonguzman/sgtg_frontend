import { inject, Injector } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ThesisWorkStorageService } from '../../modules/thesis-work/services/thesis-work-storage.service';
import { NotificationService } from '../../shared/components/notifications/services/notification.service';
import { stateList } from '../enums/state.enum';
import { NotificationType } from '../../shared/components/notifications/models/notification.model';
import { resolveEntityForGuard } from '../helpers/resolve-entity-for-guard.helper';

export const thesisRestrictedStatusGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const thesisStorage = inject(ThesisWorkStorageService);
  const notificationService = inject(NotificationService);
  const injector = inject(Injector);

  const id = route.paramMap.get('id') || route.parent?.paramMap.get('id');
  if (!id) return true;

  return resolveEntityForGuard(
    thesisStorage.isHydrated,
    () => thesisStorage.allThesisWorks(),
    work => work.thesisWorkId === id,
    injector
  ).then(currentWork => {
    if (!currentWork) return true;
    if (currentWork.state === stateList.CANCELADO || currentWork.state === stateList.SUSPENDIDO) {
      notificationService.show({
        title: 'Acceso Restringido',
        message: `La acción no está permitida porque el trabajo de grado se encuentra ${currentWork.state}.`,
        type: NotificationType.ERROR
      });
      return router.createUrlTree(['/thesis-work']);
    }
    return true;
  });
};

/**
 * Bloquea solo la VISUALIZACIÓN mientras el trabajo está SUSPENDIDO —
 * deliberadamente NO bloquea CANCELADO, porque ese queda archivado y su
 * lectura sigue siendo el propósito del módulo de Historial.
 */
export const thesisSuspendedViewGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const thesisStorage = inject(ThesisWorkStorageService);
  const notificationService = inject(NotificationService);
  const injector = inject(Injector);

  const id = route.paramMap.get('id') || route.parent?.paramMap.get('id');
  if (!id) return true;

  return resolveEntityForGuard(
    thesisStorage.isHydrated,
    () => thesisStorage.allThesisWorks(),
    work => work.thesisWorkId === id,
    injector
  ).then(currentWork => {
    if (currentWork?.state === stateList.SUSPENDIDO) {
      notificationService.show({
        title: 'Acceso Restringido',
        message: 'No es posible consultar este trabajo de grado mientras se encuentre suspendido.',
        type: NotificationType.ERROR
      });
      return router.createUrlTree(['/thesis-work']);
    }
    return true;
  });
};
