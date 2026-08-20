import { inject, Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { Evaluation } from '../../../../../core/interfaces/evaluation.interface';
import { FormattedDocument } from '../../../../../core/interfaces/formatted-document.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { Advance } from '../../../interfaces/advance.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { AdvanceEvaluationResult, SubmitAdvanceEvaluationPayload } from '../../../interfaces/advance-playload.interface';
import { readFileAsDataUrl } from '../../../../../core/utils/file-reader.utils';

@Injectable({ providedIn: 'root' })
export class EvaluateAdvanceFacadeService {
  private readonly thesisWorkService   = inject(ThesisWorkService);
  private readonly downloadService     = inject(FileDownloadService);
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

  /**
   * ← FIX CENTRAL: antes `signedDocuments: data.files?.map(file => file.name)`
   * — un string[] que ya no compila contra Evaluation.signedDocuments
   * (FormattedDocument[]). Ahora es async: lee cada archivo real de
   * retroalimentación vía readFileAsDataUrl antes de construir la
   * evaluación, así el documento adjunto apunta a contenido real.
   *
   * El fix de veredict hardcodeado (de un turno anterior) se conserva
   * intacto.
   */
  public async saveEvaluation(
    thesisWork: ThesisWork,
    advance: Advance,
    user: User,
    data: SubmitAdvanceEvaluationPayload,
    onSuccess: () => void,
    onError: () => void
  ): Promise<void> {
    const veredict = data.formValues.result === AdvanceEvaluationResult.EVALUADO
      ? stateList.EVALUADO
      : stateList.EN_REVISION;

    let signedDocuments: FormattedDocument[];
    try {
      signedDocuments = await Promise.all(
        (data.files ?? []).map(async (file) => ({
          name: file.name,
          url: await readFileAsDataUrl(file)
        }))
      );
    } catch (err) {
      console.error('Error leyendo los documentos de retroalimentación:', err);
      this.showNotification('Error al leer el archivo', 'No se pudo procesar uno de los documentos adjuntos.', NotificationType.ERROR);
      onError();
      return;
    }

    const evaluation: Evaluation = {
      id: crypto.randomUUID(),
      proposalId: thesisWork.preliminaryDraftData.proposalId,
      advanceId: advance.id,
      evaluatorId: user.id,
      evaluatorName: `${user.firstName} ${user.lastName}`,
      evaluatorRole: 'Docente / Evaluador',
      veredict,
      observations: `[${data.formValues.result.toUpperCase()}] ${data.formValues.comments}`,
      signedDocuments,
      date: new Date()
    };

    this.thesisWorkService.addEvaluationMock(thesisWork.thesisWorkId, evaluation)
      .pipe(first())
      .subscribe({
        next: () => {
          this.showNotification(
            'Evaluación Guardada',
            'Los comentarios y el estado del avance han sido actualizados exitosamente.',
            NotificationType.CONFIRMATION
          );
          onSuccess();
        },
        error: () => {
          this.showNotification('Error al guardar', 'Ocurrió un error técnico al registrar la evaluación.', NotificationType.ERROR);
          onError();
        }
      });
  }

  // ← FIX: antes "fire and forget" sin async/try-catch, y sin
  // notificación cuando el documento no tenía url. Mismo patrón ya
  // aplicado al resto de descargas del proyecto.
  public async downloadAdvance(advance: Advance): Promise<void> {
    const document = advance?.documents?.[0];
    if (!document?.url) {
      this.showNotification('Error de descarga', 'No existe un documento válido para descargar.', NotificationType.ERROR);
      return;
    }
    try {
      await this.downloadService.download(document.url, document.name);
    } catch (err) {
      console.error('Error al descargar el avance:', err);
      this.showNotification('Error de descarga', 'No se pudo descargar el documento. Intente más tarde.', NotificationType.ERROR);
    }
  }

  public showNavigationError(): void {
    this.showNotification('Error de navegación', 'No se pudieron identificar los parámetros del avance en la ruta.', NotificationType.ERROR);
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
