import { inject, Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SpecialRequestType } from '../../../enums/special-request-type.enum';

// Interfaz extraída para mantener el código limpio y fuertemente tipado
export interface SpecialRequestPayload {
  requestType: SpecialRequestType;
  comments: string;
}

@Injectable({ providedIn: 'root' })
export class RegisterSpecialRequestFacadeService {
  private readonly thesisWorkService   = inject(ThesisWorkService);
  private readonly notificationService = inject(NotificationService);

  public loadThesisWork(
    id: string,
    onSuccess: (work: ThesisWork) => void,
    onNotFound: () => void,
    onError: () => void
  ): void {
    this.thesisWorkService.getThesisWorkByIdMock(id)
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

  public processSaveRequest(
    thesisId: string,
    data: SpecialRequestPayload,
    onSuccess: () => void,
    onError: () => void
  ): void {
    // Al extender ...data, aseguramos que cumpla con el payload que espera el servicio backend
    this.thesisWorkService.createSpecialRequestMock({ ...data, thesisId })
      .pipe(first())
      .subscribe({
        next: () => {
          this.showNotification('Éxito', 'La solicitud especial ha sido registrada correctamente.', NotificationType.CONFIRMATION);
          onSuccess();
        },
        error: (err: unknown) => {
          console.error(err);
          this.showNotification('Error al guardar', 'Hubo un problema registrando la solicitud. Intente nuevamente.', NotificationType.ERROR);
          onError();
        }
      });
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
