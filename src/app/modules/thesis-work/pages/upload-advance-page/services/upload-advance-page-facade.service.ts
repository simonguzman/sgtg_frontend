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
import { readFileAsDataUrl } from '../../../../../core/utils/file-reader.utils';

@Injectable({ providedIn: 'root' })
export class UploadAdvancePageFacadeService {
  private readonly thesisWorkService   = inject(ThesisWorkService);
  private readonly notificationService = inject(NotificationService);

  public loadThesisWork(
    id: string,
    onSuccess: (thesisWork: ThesisWork) => void,
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
   * ← FIX CENTRAL: antes `url: 'url-pendiente-de-carga-s3'` — un
   * placeholder literal, no una URL real. Mismo bug que ya corregimos en
   * Propuestas/Anteproyecto, aquí con un string no vacío en vez de `''`,
   * lo que hacía que ni siquiera la validación `!url?.trim()` de
   * FileDownloadService lo detectara antes de intentar la descarga.
   *
   * uploadDate se mantiene como new Date().toISOString() — NO se cambia
   * a formatDisplayDate(): ThesisWorkAdvanceService reconstruye este
   * valor con `new Date(document.uploadDate)` para poblar
   * Advance.uploadDate, y un ISO string es parseo estándar fiable en
   * cualquier motor JS, a diferencia del formato "DD - MM - YYYY".
   */
  public async processAdvance(
    thesisId: string,
    userId: string,
    data: UploadAdvancePayload,
    onSuccess: () => void,
    onError: () => void
  ): Promise<void> {
    const advanceBlockId = crypto.randomUUID();
    const advanceMeta = {
      title: data.formValues.title,
      comments: data.formValues.comments,
      studentId: userId,
      advanceId: advanceBlockId
    };

    let documentsToUpload: FileDocument[];
    try {
      documentsToUpload = await Promise.all(
        data.files.map(async (file) => ({
          id: crypto.randomUUID(),
          name: `${data.formValues.title} - ${file.name}`,
          url: await readFileAsDataUrl(file),
          type: DocumentType.AVANCE,
          uploadDate: new Date().toISOString()
        }))
      );
    } catch (err) {
      console.error('Error leyendo los archivos del avance:', err);
      this.showNotification('Error al leer el archivo', 'No se pudo procesar uno de los archivos seleccionados.', NotificationType.ERROR);
      onError();
      return;
    }

    // ← first() agregado: faltaba en esta suscripción.
    forkJoin(
      documentsToUpload.map(document =>
        this.thesisWorkService.uploadDocumentMock(thesisId, document, advanceMeta)
      )
    ).pipe(first()).subscribe({
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
    this.showNotification('Error de navegación', 'No se pudo identificar el identificador del trabajo de grado.', NotificationType.ERROR);
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
