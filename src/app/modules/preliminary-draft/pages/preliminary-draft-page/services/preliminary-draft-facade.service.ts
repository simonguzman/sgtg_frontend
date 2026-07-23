import { computed, inject, Injectable } from '@angular/core';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { PreliminaryDraftMapperService } from './preliminary-draft-mapper.service';
import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { PRELIMINARY_DRAFT_HEADER_BUTTONS, PreliminaryDraftTableRow } from '../models/preliminary-draft-page.model';

@Injectable({ providedIn: 'root' })
export class PreliminaryDraftFacadeService {
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly authService = inject(AuthService);
  private readonly mapper = inject(PreliminaryDraftMapperService);
  private readonly notificationService = inject(NotificationService);

  public readonly tableData = computed<PreliminaryDraftTableRow[]>(() => {
    const currentUser = this.authService.currentUser();
    const isAdmin = this.authService.hasAnyRole([UserRoleType.ADMINISTRADOR]);
    const hasFullAccessRole = this.authService.hasAnyRole([
      UserRoleType.ADMINISTRADOR,
      UserRoleType.JEFE_DEP,
      UserRoleType.CONSEJO
    ]);

    // Asumimos que los ordenamos aquí mismo antes de mapear
    const activePreliminaryDrafts = this.preliminaryDraftService.preliminaryDrafts().filter(PreliminaryDraft => !PreliminaryDraft.isArchived);
    const sortedPreliminaryDrafts = [...activePreliminaryDrafts].sort((a, b) => {
      const dateA = a.createdData || a.proposalData?.createdAt || new Date(0);
      const dateB = b.createdData || b.proposalData?.createdAt || new Date(0);
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return sortedPreliminaryDrafts.map(preliminaryDraft =>
      this.mapper.mapPreliminaryDraftToTable(preliminaryDraft, hasFullAccessRole, isAdmin, String(currentUser?.id))
    );
  });

  public readonly headerButtons = computed<TableButton[]>(() => {
    const canRegister = this.authService.hasAnyRole([
      UserRoleType.ADMINISTRADOR,
      UserRoleType.DIRECTOR
    ]);
    return canRegister
      ? [...PRELIMINARY_DRAFT_HEADER_BUTTONS]
      : PRELIMINARY_DRAFT_HEADER_BUTTONS.filter(btn => btn.label !== 'Registrar anteproyecto');
  });

  public deleteDraft(id: string, onSuccess: () => void, onError: () => void): void {
    this.showNotification('Eliminando anteproyecto', 'Se está procesando la solicitud...', NotificationType.INFO);

    // Asumo que el método se llama deleteDraft en tu servicio principal
    this.preliminaryDraftService.deleteDraft(id).subscribe({
      next: () => {
        this.showNotification('Anteproyecto eliminado', 'El anteproyecto fue eliminado correctamente.', NotificationType.CONFIRMATION);
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
      'Acceso denegado',
      'No tienes permisos para realizar esta acción o el registro está bloqueado.',
      NotificationType.ERROR
    );
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
