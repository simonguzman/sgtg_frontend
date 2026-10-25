import { TrabajoGradoStoreService } from '../../../../../core/services/trabajo-grado/trabajo-grado-store.service';
import { ETAPAS_ANULABLES } from '../../../../../core/interfaces/api/trabajo-grado-api.interface';
import { computed, inject, Injectable } from '@angular/core';
import { ProposalService } from '../../../services/proposal.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { apiErrorMessage } from '../../../../../core/utils/api-error.utils';
import { ProposalMapperService } from './proposal-mapper.service';
import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { PROPOSAL_HEADER_BUTTONS, ProposalTableRow } from '../models/proposal-page.model';

@Injectable({ providedIn: 'root' })
export class ProposalFacadeService {
  private readonly proposalService = inject(ProposalService);
  private readonly authService = inject(AuthService);
  private readonly mapper = inject(ProposalMapperService);
  private readonly notificationService = inject(NotificationService);
  private readonly store = inject(TrabajoGradoStoreService);

  /** Trabajos en una etapa en la que el director puede anularlos. */
  private readonly annullableIds = computed(() => new Set(this.store.trabajos()
    .filter(trabajo => ETAPAS_ANULABLES.includes(trabajo.etapa))
    .map(trabajo => String(trabajo.id))));

  public readonly proposalsTableData = computed<ProposalTableRow[]>(() => {
    const currentUser = this.authService.currentUser();
    return this.proposalService.proposals().map(proposal =>
      this.mapper.mapProposalToTable(proposal, currentUser?.id, this.annullableIds().has(proposal.id ?? ''))
    );
  });

  public readonly headerButtons = computed<TableButton[]>(() => {
    // El jefe de departamento no dirige trabajos de grado (asigna sus evaluadores y los remite al Consejo)
    const canRegister = this.authService.hasAnyRole([
      UserRoleType.ADMINISTRADOR,
      UserRoleType.DIRECTOR
    ]) && !this.authService.hasAnyRole([UserRoleType.JEFE_DEP]);
    return canRegister
      ? [...PROPOSAL_HEADER_BUTTONS]
      : PROPOSAL_HEADER_BUTTONS.filter(btn => btn.label !== 'Registrar propuesta');
  });

  public annulProposal(id: string, justification: string, onSuccess: () => void, onError: () => void): void {
    this.proposalService.annulProposal(id, justification).subscribe({
      next: () => {
        this.showNotification('Propuesta anulada', 'El trabajo de grado quedó archivado en el historial.',
          NotificationType.CONFIRMATION);
        onSuccess();
      },
      error: (err) => {
        this.showNotification('Error', apiErrorMessage(err, 'No se pudo anular la propuesta.'), NotificationType.ERROR);
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
