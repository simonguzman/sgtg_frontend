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
    const isConsejo = this.authService.hasAnyRole([UserRoleType.CONSEJO]);
    // El backend ya entrega al Comité solo los trabajos de su programa; los ve para avalar solicitudes
    const hasFullAccessRole = this.authService.hasAnyRole([
      UserRoleType.ADMINISTRADOR,
      UserRoleType.DECANATURA,
      UserRoleType.CONSEJO,
      UserRoleType.COMITE
    ]);
    const activeThesisWorks = this.thesisWorkService.thesisWorks().filter(work => !work.isArchived);
    return activeThesisWorks.map(thesisWork =>
      this.mapper.mapThesisWorkToTable(thesisWork, hasFullAccessRole, isAdmin, isConsejo, String(currentUser?.id))
    );
  });

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
