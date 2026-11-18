import { apiErrorMessage } from '../../../../../core/utils/api-error.utils';
import { computed, inject, Injectable } from '@angular/core';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { PreliminaryDraftMapperService } from './preliminary-draft-mapper.service';
import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { PRELIMINARY_DRAFT_HEADER_BUTTONS, PreliminaryDraftTableRow } from '../models/preliminary-draft-page.model';

/** Fachada de la lista de anteproyectos. */
@Injectable({ providedIn: 'root' })
export class PreliminaryDraftFacadeService {
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly authService = inject(AuthService);
  private readonly mapper = inject(PreliminaryDraftMapperService);
  private readonly notificationService = inject(NotificationService);

  /** Anteproyectos visibles como filas de la tabla. */
  public readonly tableData = computed<PreliminaryDraftTableRow[]>(() => {
    const currentUser = this.authService.currentUser();
    const isAdmin = this.authService.hasAnyRole([UserRoleType.ADMINISTRADOR]);
    const hasFullAccessRole = this.authService.hasAnyRole([
      UserRoleType.ADMINISTRADOR,
      UserRoleType.JEFE_DEP,
      UserRoleType.CONSEJO
    ]);

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

  /** Botones de la cabecera; registrar anteproyecto solo para el director y el administrador. */
  public readonly headerButtons = computed<TableButton[]>(() => {
    const canRegister = this.authService.hasAnyRole([
      UserRoleType.ADMINISTRADOR,
      UserRoleType.DIRECTOR
    ]);
    return canRegister
      ? [...PRELIMINARY_DRAFT_HEADER_BUTTONS]
      : PRELIMINARY_DRAFT_HEADER_BUTTONS.filter(btn => btn.label !== 'Registrar anteproyecto');
  });

  /** Anula el trabajo con la justificación del director; queda archivado en el historial. */
  public annulDraft(id: string, justification: string, onSuccess: () => void, onError: () => void): void {
    this.preliminaryDraftService.annulDraft(id, justification).subscribe({
      next: () => {
        this.showNotification('Anteproyecto anulado', 'El trabajo de grado quedó archivado en el historial.',
          NotificationType.CONFIRMATION);
        onSuccess();
      },
      error: (err) => {
        this.showNotification('Error', apiErrorMessage(err, 'No se pudo anular el anteproyecto.'), NotificationType.ERROR);
        onError();
      }
    });
  }

  /** Avisa que el usuario no puede hacer la acción sobre el anteproyecto. */
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
