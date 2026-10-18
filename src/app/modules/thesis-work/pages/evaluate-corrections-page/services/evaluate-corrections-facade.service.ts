import { inject, Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { apiErrorMessage } from '../../../../../core/utils/api-error.utils';

@Injectable({ providedIn: 'root' })
export class EvaluateCorrectionsFacadeService {
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly notificationService = inject(NotificationService);

  public loadThesisWork(id: string, onSuccess: (work: ThesisWork) => void, onError: () => void): void {
    this.thesisWorkService.getThesisWorkById(id).pipe(first()).subscribe({
      next: (data) => {
        if (!data) {
          this.showNotification('No encontrado', 'El proyecto de grado solicitado no existe en la base de datos.', NotificationType.INFO);
          onError();
          return;
        }
        onSuccess(data);
      },
      error: () => {
        this.showNotification('Fallo técnico', 'Error de red al intentar descargar los metadatos.', NotificationType.ERROR);
        onError();
      }
    });
  }

  /** Registra en el backend la verificación de los ajustes del jurado coordinador. */
  public saveEvaluation(
    thesisId: string,
    verification: { fulfills: boolean; observations: string },
    onSuccess: () => void,
    onError: () => void
  ): void {
    this.thesisWorkService.verifyAdjustments(thesisId, verification.fulfills, verification.observations)
      .pipe(first())
      .subscribe({
        next: () => {
          this.showNotification('Verificación registrada', verification.fulfills
            ? 'Los ajustes cumplen: la sustentación quedó aprobada.'
            : 'Los ajustes no cumplen: la sustentación se aplazó.', NotificationType.CONFIRMATION);
          onSuccess();
        },
        error: (error: unknown) => {
          this.showNotification('No se pudo registrar la verificación',
            apiErrorMessage(error, 'Ocurrió un problema al guardar la verificación.'), NotificationType.ERROR);
          onError();
        }
      });
  }

  public showNavigationError(): void {
    this.showNotification('Error de navegación', 'No se pudo mapear la información técnica del trabajo de grado.', NotificationType.ERROR);
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
