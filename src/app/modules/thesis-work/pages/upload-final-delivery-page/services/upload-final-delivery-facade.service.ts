import { inject, Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';

@Injectable({ providedIn: 'root' })
export class UploadFinalDeliveryFacadeService {
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly notificationService = inject(NotificationService);

  public loadThesisWork(
    id: string,
    onSuccess: (thesisWork: ThesisWork) => void,
    onNotFound: () => void
  ): void {
    this.thesisWorkService.getThesisWorkByIdMock(id)
      .pipe(first())
      .subscribe({
        next: (data) => {
          if (!data) {
            this.showNotification('No encontrado', 'El proyecto solicitado no existe.', NotificationType.INFO);
            onNotFound();
            return;
          }
          onSuccess(data);
        },
        error: () => {
          this.showNotification('Error de conexión', 'Fallo técnico al recuperar los datos.', NotificationType.ERROR);
          onNotFound();
        }
      });
  }

  public processFinalDelivery(
    thesisId: string,
    files: { monograph: File; formatE: File; annexes?: File },
    onSuccess: () => void,
    onError: () => void
  ): void {
    this.thesisWorkService
      .uploadFinalDeliveryMock(thesisId, files.monograph, files.formatE, files.annexes)
      .pipe(first())
      .subscribe({
        next: () => {
          this.showNotification(
            '¡Entrega Registrada!',
            'La monografía, el Formato_E y los anexos se han procesado de manera oficial.',
            NotificationType.CONFIRMATION
          );
          onSuccess();
        },
        error: () => {
          this.showNotification('Error al guardar', 'No se pudo guardar la entrega final.', NotificationType.ERROR);
          onError();
        }
      });
  }

  public showNavigationError(): void {
    this.showNotification(
      'Error de navegación',
      'No se pudo identificar el identificador del trabajo de grado.',
      NotificationType.ERROR
    );
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
