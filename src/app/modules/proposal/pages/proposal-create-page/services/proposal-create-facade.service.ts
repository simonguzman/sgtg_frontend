import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { ProposalService } from '../../../services/proposal.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { Proposal } from '../../../interfaces/proposal.interface';

@Injectable({ providedIn: 'root' })
export class ProposalCreateFacadeService {
  private readonly proposalService     = inject(ProposalService);
  private readonly notificationService = inject(NotificationService);
  private readonly router              = inject(Router);

  /**
   * Valida las reglas de negocio antes de abrir el modal de confirmación.
   * Devuelve true si el payload es válido, false si hay un error (y notifica).
   */
  public validate(proposal: Proposal): boolean {
    const error = this.proposalService.validateProposalRules(proposal);
    if (error) {
      this.showNotification('Atención', error, NotificationType.ERROR);
      return false;
    }
    return true;
  }

  /**
   * Ejecuta la creación con notificaciones integradas.
   * El componente solo reacciona limpiando su estado o mostrando el error.
   */
  public save(
    proposal: Proposal,
    onSuccess: () => void,
    onError:   () => void
  ): void {
    this.showNotification(
      'Procesando registro',
      'Estamos guardando la información de la propuesta en el sistema...',
      NotificationType.INFO
    );

    this.proposalService.createProposalMock(proposal)
      .pipe(first())
      .subscribe({
        next: () => {
          this.showNotification(
            '¡Propuesta registrada!',
            'La propuesta ha sido creada exitosamente y ya puede ser gestionada.',
            NotificationType.CONFIRMATION
          );
          this.router.navigate(['/proposal']);
          onSuccess();
        },
        error: (err) => {
          console.error(err);
          this.showNotification(
            'Error de servidor',
            'No se pudo completar el registro. Por favor, intente nuevamente más tarde.',
            NotificationType.ERROR
          );
          onError();
        }
      });
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
