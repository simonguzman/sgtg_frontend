import { inject, Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { Evaluation } from '../../../../../core/interfaces/evaluation.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { Advance } from '../../../interfaces/advance.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { AdvanceEvaluationResult, SubmitAdvanceEvaluationPayload } from '../../../interfaces/advance-playload.interface';

@Injectable({ providedIn: 'root' })
export class EvaluateAdvanceFacadeService {
  private readonly thesisWorkService   = inject(ThesisWorkService);
  private readonly downloadService     = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);

  public loadThesisWork(
    id:        string,
    onSuccess: (work: ThesisWork) => void,
    onError:   () => void
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
   * Construye la entidad Evaluation y la persiste.
   *
   * FIX: el código original hardcodeaba `veredict: stateList.EVALUADO` sin importar
   * lo que el evaluador seleccionó en el formulario. Ahora se mapea desde
   * AdvanceEvaluationResult para reflejar el veredicto real.
   */
  public saveEvaluation(
    work:      ThesisWork,
    advance:   Advance,
    user:      User,
    data:      SubmitAdvanceEvaluationPayload,
    onSuccess: () => void,
    onError:   () => void
  ): void {
    const veredict = data.formValues.result === AdvanceEvaluationResult.EVALUADO
      ? stateList.EVALUADO
      : stateList.EN_REVISION;

    const evaluation: Evaluation = {
      id:              crypto.randomUUID(),
      proposalId:      work.preliminaryDraftData.proposalId,
      advanceId:       advance.id,
      evaluatorId:     user.id,
      evaluatorName:   `${user.firstName} ${user.lastName}`,
      evaluatorRole:   'Docente / Evaluador',
      veredict,
      observations:    `[${data.formValues.result.toUpperCase()}] ${data.formValues.comments}`,
      signedDocuments: data.files?.map(f => f.name) ?? [],
      date:            new Date()
    };

    this.thesisWorkService.addEvaluationMock(work.thesisWorkId, evaluation)
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

  public downloadAdvance(advance: Advance): void {
    const doc = advance?.documents?.[0];
    if (doc?.url) this.downloadService.download(doc.url, doc.name);
  }

  public showNavigationError(): void {
    this.showNotification(
      'Error de navegación',
      'No se pudieron identificar los parámetros del avance en la ruta.',
      NotificationType.ERROR
    );
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
