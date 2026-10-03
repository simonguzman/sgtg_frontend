import { inject, Injector } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { ThesisWorkStorageService } from '../../modules/thesis-work/services/thesis-work-storage.service';
import { NotificationService } from '../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../shared/components/notifications/models/notification.model';
import { resolveEntityForGuard } from '../helpers/resolve-entity-for-guard.helper';

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
    thesisWork => thesisWork.thesisWorkId === id,
    injector
  ).then(thesisWork => {
    if (!thesisWork) return true;
    if (thesisStorage.canUserViewThesisWork(thesisWork, currentUser.id)) return true;

    notificationService.show({
      title: 'Acceso restringido',
      message: 'No tienes ninguna relación registrada con este trabajo de grado.',
      type: NotificationType.ERROR
    });
    return router.createUrlTree(['/thesis-work']);
  });
};
