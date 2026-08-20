import { inject, Injectable } from '@angular/core';
import { first, switchMap, catchError } from 'rxjs/operators';
import { from, EMPTY, throwError } from 'rxjs';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { stateList } from '../../../../../core/enums/state.enum';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { formatThesisDate } from '../../../helpers/thesis-date.helper';
import { readFileAsDataUrl } from '../../../../../core/utils/file-reader.utils';

@Injectable({ providedIn: 'root' })
export class RegisterCorrespondenceFacadeService {
  private readonly thesisWorkService   = inject(ThesisWorkService);
  private readonly notificationService = inject(NotificationService);

  public loadThesisWork(id: string, onSuccess: (work: ThesisWork) => void, onError: () => void): void {
    this.thesisWorkService.getThesisWorkByIdMock(id).pipe(first()).subscribe({
      next: (data: ThesisWork | null | undefined) => {
        if (!data) {
          this.showNotification('Registro inexistente', 'El trabajo de grado solicitado no existe.', NotificationType.ERROR);
          onError();
          return;
        }
        onSuccess(data);
      },
      error: (err: unknown) => {
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
    // Convertimos la promesa de lectura de archivo en un Observable
    from(readFileAsDataUrl(file)).pipe(
      first(),
      catchError((err: unknown) => {
        console.error('Error leyendo el archivo de correspondencia:', err);
        this.showNotification('Error al leer el archivo', 'No se pudo procesar el documento seleccionado.', NotificationType.ERROR);
        onError();
        return EMPTY; // Detiene el flujo sin lanzar una excepción no manejada
      }),
      switchMap((fileUrl: string) => {
        const finalCorrespondenceDoc: FileDocument = {
          id:         crypto.randomUUID(),
          name:       file.name.replace('.pdf', ''),
          url:        fileUrl,
          uploadDate: formatThesisDate(),
          type:       DocumentType.FORMATO_H,
          status:     stateList.APROBADO
        };

        return this.thesisWorkService.registerCorrespondenceDocumentMock(thesisWorkId, finalCorrespondenceDoc).pipe(
          catchError((err: unknown) => {
            console.error(err);
            this.showNotification('Error en guardado', 'No se pudo registrar la correspondencia final.', NotificationType.ERROR);
            onError();
            return EMPTY;
          })
        );
      })
    ).subscribe({
      next: () => {
        this.showNotification(
          '¡Trabajo de Grado Concluido!',
          'El formato H ha sido asentado correctamente. El proceso se encuentra formalmente cerrado.',
          NotificationType.CONFIRMATION
        );
        onSuccess();
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
