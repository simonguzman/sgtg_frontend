import { inject, Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { stateList } from '../../../../../core/enums/state.enum';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { formatThesisDate } from '../../../helpers/thesis-date.helper';

@Injectable({ providedIn: 'root' })
export class RegisterCorrespondenceFacadeService {
  private readonly thesisWorkService   = inject(ThesisWorkService);
  private readonly notificationService = inject(NotificationService);

  public loadThesisWork(id: string, onSuccess: (work: ThesisWork) => void, onError: () => void): void {
    this.thesisWorkService.getThesisWorkByIdMock(id).pipe(first()).subscribe({
      next: (data) => {
        if (!data) {
          this.showNotification('Registro inexistente', 'El trabajo de grado solicitado no existe.', NotificationType.ERROR);
          onError();
          return;
        }
        onSuccess(data);
      },
      error: (err) => {
        console.error(err);
        this.showNotification('Error', 'Hubo un problema al recuperar los detalles.', NotificationType.ERROR);
        onError();
      }
    });
  }

  public processCorrespondence(
    thesisWorkId: string,
    file: File,
    onSuccess: () => void,
    onError: () => void
  ): void {
    // ← Fix: se elimina `('Resolución' as any)` como fallback — DocumentType.FORMATO_H
    // siempre existe en el enum, ese fallback nunca podía ejecutarse.
    const finalCorrespondenceDoc: FileDocument = {
      id:         crypto.randomUUID(),
      name:       file.name.replace('.pdf', ''),
      url:        `uploads/correspondencia/resolucion_${crypto.randomUUID().substring(0, 8)}.pdf`,
      uploadDate: formatThesisDate(),
      type:       DocumentType.FORMATO_H,
      status:     stateList.APROBADO
    };

    this.thesisWorkService.registerCorrespondenceDocumentMock(thesisWorkId, finalCorrespondenceDoc)
      .pipe(first())
      .subscribe({
        next: () => {
          this.showNotification(
            '¡Trabajo de Grado Concluido!',
            'El formato H ha sido asentado correctamente. El proceso se encuentra formalmente cerrado.',
            NotificationType.CONFIRMATION
          );
          onSuccess();
        },
        error: (err) => {
          console.error(err);
          this.showNotification('Error en guardado', 'No se pudo registrar la correspondencia final.', NotificationType.ERROR);
          onError();
        }
      });
  }

  public showNavigationError(): void {
    this.showNotification('Identificador faltante', 'No se pudo procesar la vista por falta de un ID válido.', NotificationType.ERROR);
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
