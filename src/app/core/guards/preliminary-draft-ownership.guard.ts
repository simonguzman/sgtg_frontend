import { inject, Injector } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { PreliminaryDraftStorageService } from '../../modules/preliminary-draft/services/preliminary-draft-storage.service';
import { NotificationService } from '../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../shared/components/notifications/models/notification.model';
import { resolveEntityForGuard } from '../helpers/resolve-entity-for-guard.helper';

/**
 * Mismo criterio que proposalOwnershipGuard. Cierra un hueco más serio
 * que "solo ver": review_preliminary_draft/evaluate_presentation
 * permiten el rol EVALUADOR/CONSEJO de forma genérica — sin este guard,
 * cualquier evaluador (no solo los asignados a ESTE anteproyecto) podía
 * navegar directo y registrar una evaluación para uno que nunca le fue
 * asignado.
 */
export const preliminaryDraftOwnershipGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const draftStorage = inject(PreliminaryDraftStorageService);
  const notificationService = inject(NotificationService);
  const injector = inject(Injector);

  const id = route.paramMap.get('id');
  const currentUser = authService.currentUser();
  if (!id || !currentUser) return true;

  return resolveEntityForGuard(
    draftStorage.isHydrated,
    () => draftStorage.allPreliminaryDrafts(),
    draft => draft.preliminaryDraftId === id,
    injector
  ).then(draft => {
    if (!draft) return true;
    if (draftStorage.canUserViewPreliminaryDraft(draft, currentUser.id)) return true;

    notificationService.show({
      title: 'Acceso restringido',
      message: 'No tienes ninguna relación registrada con este anteproyecto.',
      type: NotificationType.ERROR
    });
    return router.createUrlTree(['/preliminary-draft']);
  });
};
