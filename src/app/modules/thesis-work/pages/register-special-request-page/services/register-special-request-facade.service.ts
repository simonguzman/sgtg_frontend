import { inject, Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SpecialRequestType } from '../../../enums/special-request-type.enum';
import { SpecialRequestSubmission } from '../../../services/thesis-work-special-request.service';
import { apiErrorMessage } from '../../../../../core/utils/api-error.utils';

@Injectable({ providedIn: 'root' })
export class RegisterSpecialRequestFacadeService {
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly notificationService = inject(NotificationService);

  public loadThesisWork(
    id: string,
    onSuccess: (thesisWork: ThesisWork) => void,
    onNotFound: () => void,
    onError: () => void
  ): void {
    this.thesisWorkService.getThesisWorkById(id)
      .pipe(first())
      .subscribe({
        next: (data: ThesisWork | null | undefined) => {
          if (!data) {
            this.showNotification('No encontrado', 'El trabajo de grado especificado no existe.', NotificationType.ERROR);
            onNotFound();
            return;
          }
          onSuccess(data);
        },
        error: (err: unknown) => {
          console.error(err);
          this.showNotification('Error', 'No se pudo cargar la información del trabajo de grado.', NotificationType.ERROR);
          onError();
        }
      });
  }

  /** Registra la solicitud en el backend. */
  public processSaveRequest(
    thesisId: string,
    data: SpecialRequestSubmission,
    onSuccess: () => void,
    onError: () => void
  ): void {
    this.thesisWorkService.createSpecialRequest(thesisId, data)
      .pipe(first())
      .subscribe({
        next: () => {
          const message = data.requestType === SpecialRequestType.REANUDACION
            ? 'El trabajo de grado se reanudó correctamente.'
            : 'La solicitud quedó registrada y se notificó al Consejo de Facultad.';
          this.showNotification('Solicitud registrada', message, NotificationType.CONFIRMATION);
          onSuccess();
        },
        error: (error: unknown) => {
          this.showNotification(
            'No se pudo registrar la solicitud',
            apiErrorMessage(error, 'Hubo un problema registrando la solicitud. Intente nuevamente.'),
            NotificationType.ERROR
          );
          onError();
        }
      });
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
