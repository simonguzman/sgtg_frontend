import { inject, Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { Advance } from '../../../interfaces/advance.interface';
import { SubmitAdvanceEvaluationPayload } from '../../../interfaces/advance-playload.interface';
import { FormattedDocument } from '../../../../../core/interfaces/formatted-document.interface';
import { apiErrorMessage } from '../../../../../core/utils/api-error.utils';

@Injectable({ providedIn: 'root' })
export class EvaluateAdvanceFacadeService {
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly downloadService = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);

  public loadThesisWork(
    id: string,
    onSuccess: (thesisWork: ThesisWork) => void,
    onError: () => void
  ): void {
    this.thesisWorkService.getThesisWorkById(id)
      .pipe(first())
      .subscribe({
        next: (data) => {
          if (!data) {
            this.showNotification('No encontrado', 'El trabajo de grado solicitado no existe.', NotificationType.INFO);
            onError();
            return;
          }
          onSuccess(data);
        },
        error: () => {
          this.showNotification('Error de conexión', 'No se pudo recuperar la información del proyecto.', NotificationType.ERROR);
          onError();
        }
      });
  }

  /** Registra la revisión del informe en el backend. */
  public saveEvaluation(
    thesisWork: ThesisWork,
    advance: Advance,
    data: SubmitAdvanceEvaluationPayload,
    onSuccess: () => void,
    onError: () => void
  ): void {
    this.thesisWorkService.revisarInforme(thesisWork.thesisWorkId, advance.id, data.comments, data.notes)
      .pipe(first())
      .subscribe({
        next: () => {
          this.showNotification(
            'Revisión registrada',
            'Sus observaciones quedaron registradas en el informe mensual.',
            NotificationType.CONFIRMATION
          );
          onSuccess();
        },
        error: (error: unknown) => {
          this.showNotification(
            'No se pudo registrar la revisión',
            apiErrorMessage(error, 'Ocurrió un error técnico al registrar la revisión.'),
            NotificationType.ERROR
          );
          onError();
        }
      });
  }

  public async downloadAdvance(document: FormattedDocument): Promise<void> {
    if (!document?.url) {
      this.showNotification('Error de descarga', 'No existe un documento válido para descargar.', NotificationType.ERROR);
      return;
    }
    try {
      await this.downloadService.download(document.url, `${document.name}.pdf`);
    } catch (err) {
      console.error('Error al descargar el documento:', err);
      this.showNotification('Error de descarga', 'No se pudo descargar el documento. Intente más tarde.', NotificationType.ERROR);
    }
  }

  public showNavigationError(): void {
    this.showNotification('Error de navegación', 'No se pudieron identificar los parámetros del informe en la ruta.', NotificationType.ERROR);
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
