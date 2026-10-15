import { inject, Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { apiErrorMessage } from '../../../../../core/utils/api-error.utils';

/** Revisión del paz y salvo (formato F) de Decanatura. */
export interface PazYSalvoReview {
  approved: boolean;
  observations: string;
  formatF: File;
}

@Injectable({ providedIn: 'root' })
export class ReviewPazYSalvoFacadeService {
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly notificationService = inject(NotificationService);

  loadThesisWork(id: string, onSuccess: (work: ThesisWork) => void, onError: () => void): void {
    this.thesisWorkService.getThesisWorkByIdMock(id).pipe(first()).subscribe({
      next: work => {
        if (!work) {
          this.show('No encontrado', 'El trabajo de grado solicitado no existe.', NotificationType.INFO);
          onError();
          return;
        }
        onSuccess(work);
      },
      error: () => {
        this.show('Error', 'No se pudo cargar el trabajo de grado.', NotificationType.ERROR);
        onError();
      }
    });
  }

  save(thesisWorkId: string, review: PazYSalvoReview, onSuccess: () => void, onError: () => void): void {
    this.thesisWorkService.reviewPazYSalvo(thesisWorkId, review.approved, review.observations, review.formatF)
      .subscribe({
        next: () => {
          this.show(review.approved ? 'Paz y salvo aprobado' : 'Paz y salvo no aprobado', review.approved
            ? 'El Consejo de Facultad ya puede programar la sustentación.'
            : 'Se notificó al director y a los estudiantes con las observaciones.', NotificationType.CONFIRMATION);
          onSuccess();
        },
        error: err => {
          this.show('Error', apiErrorMessage(err, 'No se pudo registrar la revisión del paz y salvo.'),
            NotificationType.ERROR);
          onError();
        }
      });
  }

  showNavigationError(): void {
    this.show('Error de navegación', 'No se encontró el identificador del trabajo de grado.', NotificationType.ERROR);
  }

  private show(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
