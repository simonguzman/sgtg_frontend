import { inject, Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SustentationFormData } from '../../../interfaces/sustentation-form-data.interface';
import { SustentationFormPayload } from '../../../components/register-sustentation-form/register-sustentation-form.component';

@Injectable({ providedIn: 'root' })
export class RegisterSustentationFacadeService {
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
    thesisId:  string,
    payload:   SustentationFormPayload,
    file:      File,
    onSuccess: () => void,
    onError:   () => void
  ): void {
    // Mantiene el comportamiento original: formatEDocument recibe el File crudo,
    // que satisface estructuralmente los campos opcionales de SustentationFormData
    // (File.name existe nativamente).
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

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
