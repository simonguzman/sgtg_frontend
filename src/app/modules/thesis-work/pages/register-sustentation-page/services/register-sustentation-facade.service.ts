import { inject, Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { apiErrorMessage } from '../../../../../core/utils/api-error.utils';
import { SustentationFormPayload } from '../../../components/register-sustentation-form/register-sustentation-form.component';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';

/** Fecha del selector como fecha y hora local del backend, ej. `2026-07-15T14:00:00`. */
export function fechaHoraLocal(valor: string | Date): string {
  const fecha = valor instanceof Date ? valor : new Date(valor);
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`
    + `T${dos(fecha.getHours())}:${dos(fecha.getMinutes())}:00`;
}

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

  /** Programa la sesión en el backend: jurado coordinador (juror1), segundo jurado, fecha y hora, salón y formato E. */
  public processSustentation(
    thesisId: string,
    payload: SustentationFormPayload,
    file: File,
    onSuccess: () => void,
    onError: () => void
  ): void {
    this.thesisWorkService.scheduleSustentation(thesisId, {
      coordinatorId: payload.juror1,
      jurorId: payload.juror2,
      dateTime: fechaHoraLocal(payload.sustentationDate),
      location: payload.location,
      formatE: file
    })
      .pipe(first())
      .subscribe({
        next: () => {
          this.showNotification(
            'Sustentación programada',
            'Se asignaron el jurado coordinador, el segundo jurado y la fecha de la sesión.',
            NotificationType.CONFIRMATION
          );
          onSuccess();
        },
        error: (error: unknown) => {
          this.showNotification('No se pudo programar la sustentación',
            apiErrorMessage(error, 'Falló el registro de la programación.'), NotificationType.ERROR);
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
