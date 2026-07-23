import { computed, inject, Injectable } from '@angular/core';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWorkPageMapperService } from './thesis-work-page-mapper.service';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { THESIS_WORK_HEADER_BUTTONS, ThesisWorkTableRow } from '../models/thesis-work-page.model';

@Injectable({ providedIn: 'root' })
export class ThesisWorkPageFacadeService {
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly authService = inject(AuthService);
  private readonly mapper = inject(ThesisWorkPageMapperService);
  private readonly notificationService = inject(NotificationService);

  public readonly headerButtons = computed(() => THESIS_WORK_HEADER_BUTTONS);

  public readonly tableData = computed<ThesisWorkTableRow[]>(() => {
    const currentUser = this.authService.currentUser();
    const isAdmin = this.authService.hasAnyRole([UserRoleType.ADMINISTRADOR]);
    const hasFullAccessRole = this.authService.hasAnyRole([
      UserRoleType.ADMINISTRADOR,
      UserRoleType.DECANATURA,
      UserRoleType.CONSEJO
    ]);

    const activeThesisWorks = this.thesisWorkService.thesisWorks().filter(work => !work.isArchived);

    return activeThesisWorks.map(thesisWork =>
      this.mapper.mapThesisWorkToTable(thesisWork, hasFullAccessRole, isAdmin, String(currentUser?.id))
    );
  });

  public reactivateThesis(id: string, onSuccess: () => void, onError: () => void): void {
    this.showNotification('Reactivando trabajo', 'Procesando la solicitud...', NotificationType.INFO);

    this.thesisWorkService.reactivateThesisWorkMock(id).subscribe({
      next: () => {
        this.showNotification('Trabajo Reactivado', 'El trabajo ha sido reactivado correctamente.', NotificationType.CONFIRMATION);
        onSuccess();
      },
      error: () => {
        this.showNotification('Error', 'Hubo un error al reactivar el trabajo.', NotificationType.ERROR);
        onError();
      }
    });
  }

  public showRestrictedAccessNotification(): void {
    this.showNotification(
      'Acceso denegado',
      'No tienes permisos para realizar esta acción o interactuar con este registro.',
      NotificationType.ERROR
    );
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
