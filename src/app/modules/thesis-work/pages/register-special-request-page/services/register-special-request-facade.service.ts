import { inject, Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SpecialRequestType } from '../../../enums/special-request-type.enum';

@Injectable({ providedIn: 'root' })
export class RegisterSpecialRequestFacadeService {
  private readonly thesisWorkService   = inject(ThesisWorkService);
  private readonly notificationService = inject(NotificationService);

  // onNotFound y onError se mantienen separados porque el componente original
  // navega hacia atrás solo cuando el trabajo no existe, pero se queda en la
  // página (solo notifica) cuando falla la red — se preserva esa distinción.
  public loadThesisWork(
    id: string,
    onSuccess: (work: ThesisWork) => void,
    onNotFound: () => void,
    onError: () => void
  ): void {
    this.thesisWorkService.getThesisWorkByIdMock(id).pipe(first()).subscribe({
      next: (data) => {
        if (!data) {
          this.showNotification('No encontrado', 'El trabajo de grado especificado no existe.', NotificationType.ERROR);
          onNotFound();
          return;
        }
        onSuccess(data);
      },
      error: (err) => {
        console.error(err);
        this.showNotification('Error', 'No se pudo cargar la información del trabajo de grado.', NotificationType.ERROR);
        onError();
      }
    });
  }

  public processSaveRequest(
    thesisId: string,
    data: { requestType: SpecialRequestType; comments: string },
    onSuccess: () => void,
    onError: () => void
  ): void {
    this.thesisWorkService.createSpecialRequestMock({ ...data, thesisId })
      .pipe(first())
      .subscribe({
        next: () => {
          this.showNotification('Éxito', 'La solicitud especial ha sido registrada correctamente.', NotificationType.CONFIRMATION);
          onSuccess();
        },
        error: (err) => {
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
