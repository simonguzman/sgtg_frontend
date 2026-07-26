import { inject, Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { stateList } from '../../../../../core/enums/state.enum';
import { Advance } from '../../../interfaces/advance.interface';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { formatThesisDate } from '../../../helpers/thesis-date.helper';

@Injectable({ providedIn: 'root' })
export class LoadedDocumentsThesisWorkFacadeService {
  private readonly thesisWorkService   = inject(ThesisWorkService);
  private readonly downloadService     = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);

  /**
   * Ejecuta la carga de un documento genérico de avance con notificaciones integradas.
   * Se incluye first() para completar la suscripción tras la primera emisión
   * y evitar memory leaks en observables mock que no completan solos.
   */
  public uploadDocument(
    thesisId:     string,
    fileData:     { fileName: string; file: File },
    documentType: DocumentType,
    onSuccess:    () => void,
    onError:      () => void
  ): void {
    this.showNotification(
      'Subiendo documento',
      'Procesando el archivo PDF y actualizando los registros...',
      NotificationType.INFO
    );

    const newDoc: FileDocument = {
      id:         crypto.randomUUID(),
      name:       fileData.fileName.replace('.pdf', ''),
      url:        '',
      uploadDate: formatThesisDate(),  // ← reutiliza el helper del módulo
      type:       documentType,
      status:     stateList.EN_REVISION
    };

    this.thesisWorkService.uploadDocumentMock(thesisId, newDoc)
      .pipe(first())
      .subscribe({
        next: () => {
          this.showNotification(
            '¡Carga exitosa!',
            'El documento se cargó correctamente y el flujo de estados ha sido actualizado.',
            NotificationType.CONFIRMATION
          );
          onSuccess();
        },
        error: (err) => {
          console.error('Error detectado en la carga de archivos:', err);
          this.showNotification('Error de carga', 'Hubo un problema al subir el archivo. Inténtelo de nuevo.', NotificationType.ERROR);
          onError();
        }
      });
  }

  public downloadDocument(doc: FileDocument): void {
    if (!doc.url) {
      this.showNotification('Error de descarga', 'No existe una URL válida vinculada a este archivo.', NotificationType.ERROR);
      return;
    }
    this.downloadService.download(doc.url, `${doc.name}.pdf`);
  }

  public downloadDocumentByName(
    fileName:      string,
    activeTab:     string,
    selectedAdvance: Advance | null,
    thesis:        ThesisWork | null | undefined
  ): void {
    const source = activeTab === 'AVANCES'
      ? selectedAdvance?.documents
      : thesis?.documents;

    const target = source?.find(d => d.name === fileName);
    this.downloadDocument(target ?? { name: fileName, url: '' } as FileDocument);
  }

  public showRestrictedActionNotification(): void {
    this.showNotification(
      'Acción no permitida',
      'Su usuario no posee los privilegios necesarios para ejecutar esta evaluación.',
      NotificationType.ERROR
    );
  }

  public showNotFoundError(): void {
    this.showNotification('Registro no encontrado', 'No fue posible cargar los detalles de este registro.', NotificationType.ERROR);
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
