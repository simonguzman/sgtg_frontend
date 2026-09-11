import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
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
import { readFileAsDataUrl } from '../../../../../core/utils/file-reader.utils';

@Injectable({ providedIn: 'root' })
export class LoadedDocumentsThesisWorkFacadeService {
  private readonly thesisWorkService   = inject(ThesisWorkService);
  private readonly downloadService     = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);

  public async uploadDocument(
    thesisId:     string,
    fileData:     { fileName: string; file: File },
    documentType: DocumentType,
    onSuccess:    () => void,
    onError:      () => void
  ): Promise<void> {
    this.showNotification(
      'Subiendo documento',
      'Procesando el archivo PDF y actualizando los registros...',
      NotificationType.INFO
    );

    let fileUrl: string;
    try {
      fileUrl = await readFileAsDataUrl(fileData.file);
    } catch (err) {
      console.error('Error leyendo el archivo seleccionado:', err);
      this.showNotification('Error al leer el archivo', 'No se pudo procesar el archivo seleccionado.', NotificationType.ERROR);
      onError();
      return;
    }

    const newDoc: FileDocument = {
      id:         crypto.randomUUID(),
      name:       fileData.fileName.replace('.pdf', ''),
      url:        fileUrl,
      uploadDate: formatThesisDate(),
      type:       documentType,
      status:     stateList.EN_REVISION
    };

    // MEJORA: Usar firstValueFrom mantiene todo en la misma cadena de promesas
    // y hace que el código asíncrono sea verdaderamente predecible y fácil de testear.
    try {
      await firstValueFrom(this.thesisWorkService.uploadDocumentMock(thesisId, newDoc));
      this.showNotification(
        '¡Carga exitosa!',
        'El documento se cargó correctamente y el flujo de estados ha sido actualizado.',
        NotificationType.CONFIRMATION
      );
      onSuccess();
    } catch (err) {
      console.error('Error detectado en la carga de archivos:', err);
      this.showNotification('Error de carga', 'Hubo un problema al subir el archivo. Inténtelo de nuevo.', NotificationType.ERROR);
      onError();
    }
  }

  public async downloadDocument(doc: FileDocument): Promise<void> {
    if (!doc.url) {
      this.showNotification('Error de descarga', 'No existe una URL válida vinculada a este archivo.', NotificationType.ERROR);
      return;
    }
    try {
      await this.downloadService.download(doc.url, `${doc.name}.pdf`);
    } catch (err) {
      console.error(`Error al descargar el documento ${doc.name}:`, err);
      this.showNotification('Error de descarga', `No se pudo descargar ${doc.name}. Intente más tarde.`, NotificationType.ERROR);
    }
  }

  // ← FIX: eliminada la bifurcación por activeTab. selectedAdvance ya trae
  // el conjunto correcto de documentos para CUALQUIER pestaña — resuelto
  // por ThesisWorkDetailsModalResolverService al abrir el modal. Buscar en
  // thesis?.documents para "todo lo que no sea AVANCES" ignoraba que
  // Entrega Final vive en finalDeliveries[], no ahí.
  public async downloadDocumentByName(fileName: string, selectedAdvance: Advance | null): Promise<void> {
    const target = selectedAdvance?.documents?.find(d => d.name === fileName);
    await this.downloadDocument(target ?? { name: fileName, url: '' } as FileDocument);
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
