import { inject, Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { ProposalService } from '../../../services/proposal.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { Proposal } from '../../../interfaces/proposal.interface';
import { propuestaEditable } from '../../../services/proposal-rules.service';
import { apiErrorMessage } from '../../../../../core/utils/api-error.utils';

@Injectable({ providedIn: 'root' })
export class ProposalEditFacadeService {
  private readonly proposalService = inject(ProposalService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);

  public loadAndAuthorize(
    id: string,
    onAuthorized: (proposal: Proposal) => void,
    onForbidden: () => void,
    onNotFound: () => void
  ): void {
    this.proposalService.getProposalByIdMock(id)
      .pipe(first())
      .subscribe({
        next: (found) => {
          if (!found) {
            this.showNotification('Atención', 'La propuesta que intenta editar no fue encontrada en el sistema.', NotificationType.ERROR);
            onNotFound();
            return;
          }

          const isOwner = found.director?.id === this.authService.currentUser()?.id;
          if (!isOwner) {
            this.showNotification('Acceso restringido', 'Solo el director puede corregir la propuesta.', NotificationType.ERROR);
            onForbidden();
            return;
          }

          if (!propuestaEditable(found)) {
            this.showNotification('Edición no permitida',
              'La propuesta solo se puede corregir antes de radicarla o después de que el Comité no la apruebe.',
              NotificationType.ERROR);
            onForbidden();
            return;
          }

          onAuthorized({ ...found });
        }
      });
  }

  public validateRules(proposal: Proposal): string | null {
    return this.proposalService.validateProposalRules(proposal);
  }

  public saveUpdate(
    id: string,
    data: Proposal,
    onSuccess: () => void,
    onError:   () => void
  ): void {
    this.showNotification('Procesando actualización', 'Estamos guardando los cambios en la propuesta...', NotificationType.INFO);

    this.proposalService.updateProposalMock(id, data)
      .pipe(first())
      .subscribe({
        next: () => {
          this.showNotification('¡Actualización exitosa!', 'La información de la propuesta se ha modificado correctamente.', NotificationType.CONFIRMATION);
          onSuccess();
        },
        error: (err) => {
          this.showNotification('Error de actualización',
            apiErrorMessage(err, 'No se pudieron guardar los cambios. Por favor, intente de nuevo.'), NotificationType.ERROR);
          onError();
        }
      });
  }

  public showValidationError(message: string): void {
    this.showNotification('Error de actualización', message, NotificationType.ERROR);
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
