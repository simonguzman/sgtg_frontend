import { inject, Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { PazYSalvoReviewPayload } from '../../../interfaces/paz-y-salvo-review.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { apiErrorMessage } from '../../../../../core/utils/api-error.utils';

@Injectable({ providedIn: 'root' })
export class ReviewPazYSalvoFacadeService {
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly downloadService = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);

  public loadThesisWork(id: string, onSuccess: (work: ThesisWork) => void, onError: () => void): void {
    this.thesisWorkService.getThesisWorkById(id).pipe(first()).subscribe({
      next: work => {
        if (!work) {
          this.showNotification('No encontrado', 'El trabajo de grado solicitado no existe.', NotificationType.INFO);
          onError();
          return;
        }
        onSuccess(work);
      },
      error: () => {
        this.showNotification('Error', 'No se pudo cargar el trabajo de grado.', NotificationType.ERROR);
        onError();
      }
    });
  }

  /** Registra en el backend la revisión del paz y salvo de Decanatura con el formato F. */
  public processPazYSalvo(
    thesisId: string,
    payload: PazYSalvoReviewPayload,
    file: File,
    onSuccess: () => void,
    onError: () => void
  ): void {
    this.thesisWorkService.reviewPazYSalvo(thesisId, payload.approved, payload.observations, file)
      .pipe(first())
      .subscribe({
        next: () => {
          this.showNotification(
            payload.approved ? 'Paz y salvo aprobado' : 'Paz y salvo no aprobado',
            payload.approved
              ? 'El Consejo de Facultad ya puede programar la sustentación.'
              : 'Se notificó al director y a los estudiantes con las observaciones.',
            NotificationType.CONFIRMATION
          );
          onSuccess();
        },
        error: (error: unknown) => {
          this.showNotification('Error',
            apiErrorMessage(error, 'No se pudo registrar la revisión del paz y salvo.'), NotificationType.ERROR);
          onError();
        }
      });
  }

  public async downloadDocument(document: FileDocument): Promise<void> {
    if (!document?.url) {
      this.showNotification('Error de descarga', 'No existe una URL válida vinculada a este archivo.', NotificationType.ERROR);
      return;
    }
    try {
      await this.downloadService.download(document.url, `${document.name}.pdf`);
    } catch (err) {
      console.error(`Error al descargar el documento ${document.name}:`, err);
      this.showNotification('Error de descarga', `No se pudo descargar ${document.name}. Intente más tarde.`, NotificationType.ERROR);
    }
  }

  public showNavigationError(): void {
    this.showNotification('Error de navegación', 'No se encontró el identificador del trabajo de grado.', NotificationType.ERROR);
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
