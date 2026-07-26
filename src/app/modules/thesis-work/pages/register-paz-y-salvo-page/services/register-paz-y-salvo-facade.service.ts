import { inject, Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { PazYSalvoPayload } from '../../../interfaces/paz-y-salvo-playload.interface';

@Injectable({ providedIn: 'root' })
export class RegisterPazYSalvoFacadeService {
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
        error: ()     => onError()
      });
  }

  public processPazYSalvo(
    thesisId:  string,
    payload:   PazYSalvoPayload,
    file:      File,
    onSuccess: () => void,
    onError:   () => void
  ): void {
    this.thesisWorkService.registerPazYSalvoMock(thesisId, payload, file)
      .pipe(first())
      .subscribe({
        next: () => {
          const isApproved = payload.academicApproved && payload.financialApproved;
          this.showNotification(
            isApproved ? 'Paz y Salvo Aprobado' : 'Paz y Salvo No Aprobado',
            isApproved
              ? 'El registro se ha guardado correctamente y el proyecto puede avanzar.'
              : 'Se registró el Paz y Salvo. La entrega final ha sido rechazada y debe volver a cargarse.',
            isApproved ? NotificationType.CONFIRMATION : NotificationType.INFO
          );
          onSuccess();
        },
        error: () => {
          this.showNotification('Error', 'Fallo al guardar.', NotificationType.ERROR);
          onError();
        }
      });
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
