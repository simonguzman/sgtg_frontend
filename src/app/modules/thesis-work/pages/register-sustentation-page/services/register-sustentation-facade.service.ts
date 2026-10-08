import { inject, Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SustentationFormData } from '../../../interfaces/sustentation-form-data.interface';
import { SustentationFormPayload } from '../../../components/register-sustentation-form/register-sustentation-form.component';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';

@Injectable({ providedIn: 'root' })
export class RegisterSustentationFacadeService {
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly downloadService = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);

  public loadThesisWork(
    id: string,
    onSuccess: (thesisWork: ThesisWork) => void,
    onError: () => void
  ): void {
    this.thesisWorkService.getThesisWorkByIdMock(id)
      .pipe(first())
      .subscribe({
        next: (data) => {
          if (!data) {
            this.showNotification('Error', 'No se identificó el ID del Trabajo de Grado.', NotificationType.ERROR);
            onError();
            return;
          }
          onSuccess(data);
        },
        error: () => {
          this.showNotification('Error', 'No se identificó el ID del Trabajo de Grado.', NotificationType.ERROR);
          onError();
        }
      });
  }

  public processSustentation(
    thesisId: string,
    payload: SustentationFormPayload,
    file: File,
    onSuccess: () => void,
    onError: () => void
  ): void {
    const requestData: SustentationFormData = { ...payload, formatEDocument: file };

    this.thesisWorkService.saveSustentationRegistryMock(thesisId, requestData)
      .pipe(first())
      .subscribe({
        next: () => {
          this.showNotification(
            'Sustentación Agendada',
            'Se han asignado los jurados y la programación oficial correctamente.',
            NotificationType.CONFIRMATION
          );
          onSuccess();
        },
        error: () => {
          this.showNotification('Error', 'Fallo al procesar el agendamiento.', NotificationType.ERROR);
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

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
