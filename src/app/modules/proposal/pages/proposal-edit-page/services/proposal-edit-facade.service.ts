import { inject, Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { ProposalService } from '../../../services/proposal.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { Proposal } from '../../../interfaces/proposal.interface';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';

@Injectable({ providedIn: 'root' })
export class ProposalEditFacadeService {
  private readonly proposalService     = inject(ProposalService);
  private readonly authService         = inject(AuthService);
  private readonly notificationService = inject(NotificationService);

  /**
   * Carga la propuesta y verifica permisos de edición.
   * Ejecuta el callback correspondiente según el resultado.
   */
  public loadAndAuthorize(
    id: string,
    onAuthorized: (proposal: Proposal) => void,
    onForbidden:  () => void,
    onNotFound:   () => void
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

          const currentUser = this.authService.currentUser();
          const isAdmin     = this.authService.hasAnyRole([UserRoleType.ADMINISTRADOR]);
          const isOwner     = found.director?.id === currentUser?.id;

          if (!isAdmin && !isOwner) {
            this.showNotification('Acceso restringido', 'No tienes permisos para editar esta propuesta.', NotificationType.ERROR);
            onForbidden();
            return;
          }

          onAuthorized({ ...found });
        }
      });
  }

  /**
   * Valida las reglas de negocio antes de guardar.
   * Devuelve el mensaje de error o null si todo es válido.
   */
  public validateRules(proposal: Proposal): string | null {
    return this.proposalService.validateProposalRules(proposal);
  }

  /**
   * Ejecuta la actualización con notificaciones integradas.
   */
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
        error: () => {
          this.showNotification('Error de actualización', 'No se pudieron guardar los cambios. Por favor, intente de nuevo.', NotificationType.ERROR);
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
