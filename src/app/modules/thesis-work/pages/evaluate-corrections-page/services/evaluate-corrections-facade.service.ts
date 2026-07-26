import { inject, Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { Evaluation } from '../../../../../core/interfaces/evaluation.interface';

@Injectable({ providedIn: 'root' })
export class EvaluateCorrectionsFacadeService {
  private readonly thesisWorkService   = inject(ThesisWorkService);
  private readonly notificationService = inject(NotificationService);

  public loadThesisWork(id: string, onSuccess: (work: ThesisWork) => void, onError: () => void): void {
    this.thesisWorkService.getThesisWorkByIdMock(id).pipe(first()).subscribe({
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

  public saveEvaluation(
    thesisId: string,
    evaluation: Omit<Evaluation, 'id' | 'date'>,
    file: File,
    onSuccess: () => void,
    onError: () => void
  ): void {
    this.thesisWorkService.evaluateCorrectedDocumentsMock(thesisId, evaluation, file)
      .pipe(first())
      .subscribe({
        next: () => {
          this.showNotification('Evaluación Oficial Registrada', 'El dictamen basado en el histórico de evaluaciones ha sido procesado de forma exitosa.', NotificationType.CONFIRMATION);
          onSuccess();
        },
        error: () => {
          this.showNotification('Error al registrar', 'Ocurrió un problema de persistencia al guardar el dictamen del jurado.', NotificationType.ERROR);
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
