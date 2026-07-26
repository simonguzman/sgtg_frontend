import { inject, Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';

@Injectable({ providedIn: 'root' })
export class RegisterCorrectedDocumentsFacadeService {
  private readonly thesisWorkService   = inject(ThesisWorkService);
  private readonly notificationService = inject(NotificationService);

  public loadThesisWork(
    id: string,
    onSuccess: (work: ThesisWork) => void,
    onError: () => void
  ): void {
    this.thesisWorkService.getThesisWorkByIdMock(id).pipe(first()).subscribe({
      next: (data) => {
        if (!data) {
          this.showNotification('No encontrado', 'El proyecto solicitado no existe.', NotificationType.INFO);
          onError();
          return;
        }
        onSuccess(data);
      },
      error: () => {
        this.showNotification('Error de conexión', 'Fallo técnico al recuperar los datos.', NotificationType.ERROR);
        onError();
      }
    });
  }

  public processCorrectedDocuments(
    thesisId: string,
    files: { monograph: File; annexes: File },
    onSuccess: () => void,
    onError: () => void
  ): void {
    this.thesisWorkService.uploadCorrectedDocumentsMock(thesisId, files.monograph, files.annexes)
      .pipe(first())
      .subscribe({
        next: () => {
          this.showNotification('¡Documentos Registrados!', 'La monografía corregida ha sido cargada exitosamente.', NotificationType.CONFIRMATION);
          onSuccess();
        },
        error: () => {
          this.showNotification('Error al guardar', 'No se pudo guardar la documentación corregida.', NotificationType.ERROR);
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
