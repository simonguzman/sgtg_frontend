import { inject, Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { stateList } from '../../../../../core/enums/state.enum';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SustentationEvaluationPayload } from '../../../components/evaluate-sustentation-form/evaluate-sustentation-form.component';

// Reemplaza el if/else if de la página original por un lookup declarativo —
// mismo patrón usado en TAB_MODAL_HEADERS del módulo de documentos cargados.
const VERDICT_NOTIFICATION_CONFIG: Partial<Record<stateList, { title: string; type: NotificationType }>> = {
  [stateList.NO_APROBADO]: { title: 'Sustentación No Aprobada', type: NotificationType.ERROR },
  [stateList.APLAZADO]:    { title: 'Sustentación Aplazada',    type: NotificationType.INFO }
};
const DEFAULT_VERDICT_NOTIFICATION = { title: 'Sustentación Evaluada', type: NotificationType.CONFIRMATION };

@Injectable({ providedIn: 'root' })
export class EvaluateSustentationFacadeService {
  private readonly thesisWorkService   = inject(ThesisWorkService);
  private readonly notificationService = inject(NotificationService);

  public loadThesisWork(
    id:        string,
    onSuccess: (work: ThesisWork) => void,
    onError:   () => void
  ): void {
    this.thesisWorkService.getThesisWorkByIdMock(id)
      .pipe(first())
      .subscribe({
        next:  (data) => data ? onSuccess(data) : onError(),
        error: () => {
          this.showNotification('Error de carga', 'No se pudo recuperar la información del proyecto.', NotificationType.ERROR);
          onError();
        }
      });
  }

  public processEvaluation(
    thesisId:  string,
    payload:   SustentationEvaluationPayload,
    file:      File,
    onSuccess: () => void,
    onError:   () => void
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

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
