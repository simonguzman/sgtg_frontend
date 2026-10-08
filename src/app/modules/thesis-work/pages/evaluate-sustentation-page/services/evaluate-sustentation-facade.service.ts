import { inject, Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { stateList } from '../../../../../core/enums/state.enum';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SustentationEvaluationPayload } from '../../../components/evaluate-sustentation-form/evaluate-sustentation-form.component';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';

const VERDICT_NOTIFICATION_CONFIG: Partial<Record<stateList, { title: string; type: NotificationType }>> = {
  [stateList.NO_APROBADO]: { title: 'Sustentación No Aprobada', type: NotificationType.ERROR },
  [stateList.APLAZADO]: { title: 'Sustentación Aplazada', type: NotificationType.INFO }
};
const DEFAULT_VERDICT_NOTIFICATION = { title: 'Sustentación Evaluada', type: NotificationType.CONFIRMATION };

@Injectable({ providedIn: 'root' })
export class EvaluateSustentationFacadeService {
  private readonly thesisWorkService   = inject(ThesisWorkService);
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
        next: (data) => data ? onSuccess(data) : onError(),
        error: () => {
          this.showNotification('Error de carga', 'No se pudo recuperar la información del proyecto.', NotificationType.ERROR);
          onError();
        }
      });
  }

  public processEvaluation(
    thesisId: string,
    payload: SustentationEvaluationPayload,
    file: File,
    onSuccess: () => void,
    onError: () => void
  ): void {
    this.thesisWorkService.registerSustentationVerdictMock(thesisId, payload, file)
      .pipe(first())
      .subscribe({
        next: () => {
          const config = VERDICT_NOTIFICATION_CONFIG[payload.veredict] ?? DEFAULT_VERDICT_NOTIFICATION;
          this.showNotification(
            config.title,
            `El veredicto de la sustentación ha sido registrado correctamente bajo el estado de [${payload.veredict}].`,
            config.type
          );
          onSuccess();
        },
        error: () => {
          this.showNotification('Error de Red', 'Fallo la comunicación al almacenar la evaluación.', NotificationType.ERROR);
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
