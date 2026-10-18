import { inject, Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { stateList } from '../../../../../core/enums/state.enum';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import {
  INASISTENCIA, SustentationEvaluationPayload
} from '../../../components/evaluate-sustentation-form/evaluate-sustentation-form.component';
import { CalificacionApi } from '../../../../../core/interfaces/api/trabajo-grado-api.interface';
import { apiErrorMessage } from '../../../../../core/utils/api-error.utils';

/** Calificación del backend para cada veredicto del formulario. */
const CALIFICACIONES: Partial<Record<stateList, CalificacionApi>> = {
  [stateList.APROBADO]: 'APROBADO',
  [stateList.APROBADO_CON_OBSERVACIONES]: 'APROBADO_CON_OBSERVACIONES',
  [stateList.APLAZADO]: 'APLAZADO',
  [stateList.NO_APROBADO]: 'NO_APROBADO'
};
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
    this.thesisWorkService.getThesisWorkById(id)
      .pipe(first())
      .subscribe({
        next: (data) => data ? onSuccess(data) : onError(),
        error: () => {
          this.showNotification('Error de carga', 'No se pudo recuperar la información del proyecto.', NotificationType.ERROR);
          onError();
        }
      });
  }

  /**
   * Registra en el backend la calificación del coordinador (con el acta) o la
   * inasistencia del estudiante.
   */
  public processEvaluation(
    thesisId: string,
    payload: SustentationEvaluationPayload,
    file: File | null,
    onSuccess: () => void,
    onError: () => void
  ): void {
    const veredict = payload.veredict;
    const peticion = veredict === INASISTENCIA
      ? this.thesisWorkService.registerNonAttendance(thesisId, payload.observations)
      : this.thesisWorkService.gradeSustentation(thesisId, CALIFICACIONES[veredict]!, payload.observations, file!);
    peticion
      .pipe(first())
      .subscribe({
        next: () => {
          if (veredict === INASISTENCIA) {
            this.showNotification('Inasistencia registrada',
              'Se registró la inasistencia del estudiante a la sesión de sustentación.', NotificationType.INFO);
          } else {
            const config = VERDICT_NOTIFICATION_CONFIG[veredict] ?? DEFAULT_VERDICT_NOTIFICATION;
            this.showNotification(config.title,
              `La calificación de la sustentación quedó registrada como [${veredict}].`, config.type);
          }
          onSuccess();
        },
        error: (error: unknown) => {
          this.showNotification('No se pudo registrar la calificación',
            apiErrorMessage(error, 'Falló la comunicación al almacenar la evaluación.'), NotificationType.ERROR);
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
