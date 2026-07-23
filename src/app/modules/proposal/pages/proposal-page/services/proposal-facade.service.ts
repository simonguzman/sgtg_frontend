import { computed, inject, Injectable } from '@angular/core';
import { ProposalService } from '../../../services/proposal.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ProposalMapperService } from './proposal-mapper.service';
import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { PROPOSAL_HEADER_BUTTONS, ProposalTableRow } from '../models/proposal-page.model';

@Injectable({ providedIn: 'root' })
export class ProposalFacadeService {
  private readonly proposalService = inject(ProposalService);
  private readonly authService    = inject(AuthService);
  private readonly mapper         = inject(ProposalMapperService);
  private readonly notificationService = inject(NotificationService);

  public readonly proposalsTableData = computed<ProposalTableRow[]>(() => {
    const currentUser = this.authService.currentUser();
    const isAdmin     = this.authService.hasAnyRole([UserRoleType.ADMINISTRADOR]);
    return this.proposalService.proposals().map(proposal =>
      this.mapper.mapProposalToTable(proposal, isAdmin, currentUser?.id)
    );
  });

  public readonly headerButtons = computed<TableButton[]>(() => {
    const canRegister = this.authService.hasAnyRole([
      UserRoleType.ADMINISTRADOR,
      UserRoleType.DIRECTOR
    ]);
    return canRegister
      ? [...PROPOSAL_HEADER_BUTTONS]
      : PROPOSAL_HEADER_BUTTONS.filter(btn => btn.label !== 'Registrar propuesta');
  });

  public deleteProposal(id: string, onSuccess: () => void, onError: () => void): void {
    this.showNotification('Eliminando propuesta', 'Se está procesando la solicitud...', NotificationType.INFO);
    this.proposalService.deleteProposalMock(id).subscribe({
      next: () => {
        this.showNotification('Propuesta eliminada', 'La propuesta fue eliminada correctamente.', NotificationType.CONFIRMATION);
        onSuccess();
      },
      error: () => {
        this.showNotification('Error', 'No se pudo completar la eliminación.', NotificationType.ERROR);
        onError();
      }
    });
  }

  public showRestrictedAccessNotification(): void {
    this.showNotification(
      'Acceso restringido',
      'No tienes permisos para realizar esta acción sobre esta propuesta.',
      NotificationType.ERROR
    );
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
