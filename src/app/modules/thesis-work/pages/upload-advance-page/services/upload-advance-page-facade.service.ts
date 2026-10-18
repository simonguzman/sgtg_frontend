import { inject, Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { UploadAdvancePayload } from '../../../interfaces/advance-playload.interface';
import { apiErrorMessage } from '../../../../../core/utils/api-error.utils';

@Injectable({ providedIn: 'root' })
export class UploadAdvancePageFacadeService {
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly notificationService = inject(NotificationService);

  public loadThesisWork(
    id: string,
    onSuccess: (thesisWork: ThesisWork) => void,
    onNotFound: () => void
  ): void {
    this.thesisWorkService.getThesisWorkById(id)
      .pipe(first())
      .subscribe({
        next: (data) => {
          if (!data) {
            this.showNotification('No encontrado', 'El trabajo de grado solicitado no existe.', NotificationType.INFO);
            onNotFound();
            return;
          }
          onSuccess(data);
        },
        error: () => {
          this.showNotification('Error de conexión', 'No se pudo obtener la información del trabajo de grado.', NotificationType.ERROR);
          onNotFound();
        }
      });
  }

  /** Radica el informe mensual en el backend. */
  public processAdvance(
    thesisId: string,
    data: UploadAdvancePayload,
    onSuccess: () => void,
    onError: () => void
  ): void {
    this.thesisWorkService.radicarInforme(thesisId, data.file, data.comments)
      .pipe(first())
      .subscribe({
        next: () => {
          this.showNotification(
            'Informe radicado',
            'El informe mensual quedó registrado y se notificó al director para su revisión.',
            NotificationType.CONFIRMATION
          );
          onSuccess();
        },
        error: (error: unknown) => {
          this.showNotification(
            'No se pudo radicar el informe',
            apiErrorMessage(error, 'Ocurrió un problema al subir el informe mensual. Intente nuevamente.'),
            NotificationType.ERROR
          );
          onError();
        }
      });
  }

  public showNavigationError(): void {
    this.showNotification('Error de navegación', 'No se pudo identificar el identificador del trabajo de grado.', NotificationType.ERROR);
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
