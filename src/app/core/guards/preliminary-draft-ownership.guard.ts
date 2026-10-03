import { inject, Injector } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { PreliminaryDraftStorageService } from '../../modules/preliminary-draft/services/preliminary-draft-storage.service';
import { NotificationService } from '../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../shared/components/notifications/models/notification.model';
import { resolveEntityForGuard } from '../helpers/resolve-entity-for-guard.helper';

export const preliminaryDraftOwnershipGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const preliminaryDraftStorage = inject(PreliminaryDraftStorageService);
  const notificationService = inject(NotificationService);
  const injector = inject(Injector);

  const id = route.paramMap.get('id');
  const currentUser = authService.currentUser();
  if (!id || !currentUser) return true;

  return resolveEntityForGuard(
    preliminaryDraftStorage.isHydrated,
    () => preliminaryDraftStorage.allPreliminaryDrafts(),
    preliminaryDraft => preliminaryDraft.preliminaryDraftId === id,
    injector
  ).then(preliminaryDraft => {
    if (!preliminaryDraft) return true;
    if (preliminaryDraftStorage.canUserViewPreliminaryDraft(preliminaryDraft, currentUser.id)) return true;

    notificationService.show({
      title: 'Acceso restringido',
      message: 'No tienes ninguna relación registrada con este anteproyecto.',
      type: NotificationType.ERROR
    });
    return router.createUrlTree(['/preliminary-draft']);
  });
};
