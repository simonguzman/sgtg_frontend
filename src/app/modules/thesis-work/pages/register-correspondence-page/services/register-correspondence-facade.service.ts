import { inject, Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { apiErrorMessage } from '../../../../../core/utils/api-error.utils';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';

@Injectable({ providedIn: 'root' })
export class RegisterCorrespondenceFacadeService {
  private readonly thesisWorkService   = inject(ThesisWorkService);
  private readonly notificationService = inject(NotificationService);

  public loadThesisWork(id: string, onSuccess: (work: ThesisWork) => void, onError: () => void): void {
    this.thesisWorkService.getThesisWorkById(id).pipe(first()).subscribe({
      next: (data: ThesisWork | null | undefined) => {
        if (!data) {
          this.showNotification('Registro inexistente', 'El trabajo de grado solicitado no existe.', NotificationType.ERROR);
          onError();
          return;
        }
        onSuccess(data);
      },
      error: (err: unknown) => {
        console.error(err);
        this.showNotification('Error', 'Hubo un problema al recuperar los detalles.', NotificationType.ERROR);
        onError();
      }
    });
  }

  /** Carga en el backend la versión definitiva (formato H) del jurado coordinador: el trabajo finaliza. */
  public processCorrespondence(
    thesisWorkId: string,
    file: File,
    onSuccess: () => void,
    onError: () => void
  ): void {
    this.thesisWorkService.uploadFinalVersion(thesisWorkId, file).pipe(first()).subscribe({
      next: () => {
        this.showNotification(
          '¡Trabajo de grado finalizado!',
          'La versión definitiva (formato H) quedó registrada y el trabajo de grado finalizó.',
          NotificationType.CONFIRMATION
        );
        onSuccess();
      },
      error: (error: unknown) => {
        this.showNotification('No se pudo cargar la versión definitiva',
          apiErrorMessage(error, 'No se pudo registrar la versión definitiva.'), NotificationType.ERROR);
        onError();
      }
    });
  }

  public showNavigationError(): void {
    this.showNotification('Identificador faltante', 'No se pudo procesar la vista por falta de un ID válido.', NotificationType.ERROR);
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
