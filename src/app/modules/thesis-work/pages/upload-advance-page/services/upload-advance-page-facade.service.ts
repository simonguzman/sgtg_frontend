import { inject, Injectable } from '@angular/core';
import { forkJoin } from 'rxjs';
import { first } from 'rxjs/operators';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { UploadAdvancePayload } from '../../../interfaces/advance-playload.interface';

@Injectable({ providedIn: 'root' })
export class UploadAdvanceFacadeService {
  private readonly thesisWorkService   = inject(ThesisWorkService);
  private readonly notificationService = inject(NotificationService);

  /**
   * Carga el trabajo de grado por ID con notificaciones integradas.
   * first() garantiza que la suscripción se complete tras la primera emisión.
   */
  public loadThesisWork(
    id:         string,
    onSuccess:  (work: ThesisWork) => void,
    onNotFound: () => void
  ): void {
    this.thesisWorkService.getThesisWorkByIdMock(id)
      .pipe(first())
      .subscribe({
        next: (data) => {
          if (!data) {
            this.showNotification('No encontrado', 'El trabajo de grado solicitado no existe.', NotificationType.INFO);
            onNotFound();
            return;
          }
          onSuccess(data);
        },
        error: () => {
          this.showNotification('Error de conexión', 'No se pudo obtener la información del trabajo de grado.', NotificationType.ERROR);
          onNotFound();
        }
      });
  }

  /**
   * Construye los documentos del avance y ejecuta las subidas en paralelo.
   * forkJoin completa automáticamente cuando todas las subidas terminan.
   */
  public processAdvance(
    thesisId:  string,
    userId:    string,
    data:      UploadAdvancePayload,
    onSuccess: () => void,
    onError:   () => void
  ): void {
    const advanceBlockId = crypto.randomUUID();
    const advanceMeta = {
      title:     data.formValues.title,
      comments:  data.formValues.comments,
      studentId: userId,
      advanceId: advanceBlockId
    };

    const documentsToUpload: FileDocument[] = data.files.map(file => ({
      id:         crypto.randomUUID(),
      name:       `${data.formValues.title} - ${file.name}`,
      url:        'url-pendiente-de-carga-s3',
      type:       DocumentType.AVANCE,
      uploadDate: new Date().toISOString()
    }));

    forkJoin(
      documentsToUpload.map(doc =>
        this.thesisWorkService.uploadDocumentMock(thesisId, doc, advanceMeta)
      )
    ).subscribe({
      next: () => {
        this.showNotification(
          'Avance registrado',
          'Los archivos del avance han sido guardados y puestos en revisión exitosamente.',
          NotificationType.CONFIRMATION
        );
        onSuccess();
      },
      error: () => {
        this.showNotification(
          'Error al guardar',
          'Ocurrió un problema al subir los documentos del avance. Intente nuevamente.',
          NotificationType.ERROR
        );
        onError();
      }
    });
  }

  public showNavigationError(): void {
    this.showNotification(
      'Error de navegación',
      'No se pudo identificar el identificador del trabajo de grado.',
      NotificationType.ERROR
    );
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
