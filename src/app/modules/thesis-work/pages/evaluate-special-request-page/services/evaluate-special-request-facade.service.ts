import { inject, Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SpecialRequest } from '../../../interfaces/special-request.interface';
import { SpecialRequestDecision } from '../../../services/thesis-work-special-request.service';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { apiErrorMessage } from '../../../../../core/utils/api-error.utils';

@Injectable({ providedIn: 'root' })
export class EvaluateSpecialRequestFacadeService {
  private readonly thesisWorkService   = inject(ThesisWorkService);
  private readonly notificationService = inject(NotificationService);
  private readonly downloadService     = inject(FileDownloadService);

  public loadThesisWorkAndRequest(
    thesisId: string,
    requestId: string,
    onSuccess: (thesisWork: ThesisWork, request: SpecialRequest) => void,
    onError: () => void
  ): void {
    this.thesisWorkService.getThesisWorkByIdMock(thesisId).pipe(first()).subscribe({
      next: (data) => {
        if (!data) {
          this.showError('El trabajo de grado especificado no existe.');
          onError();
          return;
        }
        const request = data.specialRequests?.find((req: SpecialRequest) => req.id === requestId);
        if (!request) {
          this.showError('No se encontró la solicitud especificada.');
          onError();
          return;
        }
        onSuccess(data, request);
      },
      error: () => {
        this.showError('No se pudo recuperar la información del proyecto.');
        onError();
      }
    });
  }

  /** Registra la decisión del Consejo en el backend. */
  public processEvaluation(
    thesisId: string,
    request: SpecialRequest,
    decision: SpecialRequestDecision,
    onSuccess: () => void,
    onError: () => void
  ): void {
    this.thesisWorkService.evaluateSpecialRequest(thesisId, request, decision)
      .pipe(first())
      .subscribe({
        next: () => {
          this.notificationService.show({
            title: 'Decisión registrada',
            message: 'La decisión del Consejo sobre la solicitud quedó registrada.',
            type: NotificationType.CONFIRMATION
          });
          onSuccess();
        },
        error: (error: unknown) => {
          this.notificationService.show({
            title: 'No se pudo registrar la decisión',
            message: apiErrorMessage(error, 'Falló la comunicación al registrar la decisión.'),
            type: NotificationType.ERROR
          });
          onError();
        }
      });
  }

  public async downloadDocument(document: FileDocument): Promise<void> {
    try {
      await this.downloadService.download(document.url, `${document.name}.pdf`);
    } catch (err) {
      console.error('Error al descargar el documento de la solicitud:', err);
      this.showError('No se pudo descargar el documento. Intente más tarde.');
    }
  }

  private showError(message: string): void {
    this.notificationService.show({ title: 'Error de carga', message, type: NotificationType.ERROR });
  }
}
