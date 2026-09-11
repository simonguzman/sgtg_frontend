import { inject, Injector } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { ProposalStorageService } from '../../modules/proposal/services/proposal-storage.service';
import { NotificationService } from '../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../shared/components/notifications/models/notification.model';
import { resolveEntityForGuard } from '../helpers/resolve-entity-for-guard.helper';

/**
 * Verifica que el usuario tenga una relación real con ESTA propuesta
 * (autor, director, codirector, asesor) o un rol privilegiado
 * (Administrador, Comité) — no solo que su rol general esté permitido en
 * la ruta. roleGuard filtra por categoría; este guard cierra el hueco de
 * que cualquier Director pudiera navegar directo a la URL de detalle de
 * una propuesta ajena.
 */
export const proposalOwnershipGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const proposalStorage = inject(ProposalStorageService);
  const notificationService = inject(NotificationService);
  const injector = inject(Injector);

  const id = route.paramMap.get('id');
  const currentUser = authService.currentUser();
  if (!id || !currentUser) return true;

  return resolveEntityForGuard(
    proposalStorage.isHydrated,
    () => proposalStorage.allProposals(),
    proposal => proposal.id === id,
    injector
  ).then(proposal => {
    if (!proposal) return true; // el componente maneja "no encontrado"
    if (proposalStorage.canUserViewProposal(proposal, currentUser.id)) return true;

    notificationService.show({
      title: 'Acceso restringido',
      message: 'No tienes ninguna relación registrada con esta propuesta.',
      type: NotificationType.ERROR
    });
    return router.createUrlTree(['/proposal']);
  });
};
