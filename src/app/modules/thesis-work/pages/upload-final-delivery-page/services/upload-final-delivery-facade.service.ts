import { inject, Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SustentationRequestFiles } from '../../../services/thesis-work-sustentation.service';
import { apiErrorMessage } from '../../../../../core/utils/api-error.utils';

@Injectable({ providedIn: 'root' })
export class UploadFinalDeliveryFacadeService {
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

  /** Solicita la sustentación en el backend con los documentos de la entrega final. */
  public processFinalDelivery(
    thesisId: string,
    files: SustentationRequestFiles,
    onSuccess: () => void,
    onError: () => void
  ): void {
    this.thesisWorkService
      .requestSustentation(thesisId, files)
      .pipe(first())
      .subscribe({
        next: () => {
          this.showNotification(
            'Sustentación solicitada',
            'La entrega final quedó registrada y el trabajo pasó a sustentación. El Consejo de Facultad la programará.',
            NotificationType.CONFIRMATION
          );
          onSuccess();
        },
        error: (error: unknown) => {
          this.showNotification('No se pudo solicitar la sustentación',
            apiErrorMessage(error, 'No se pudo guardar la entrega final.'), NotificationType.ERROR);
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
