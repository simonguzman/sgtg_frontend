import { inject, Injectable } from '@angular/core';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { Advance } from '../../../interfaces/advance.interface';

@Injectable({ providedIn: 'root' })
export class LoadedDocumentsThesisWorkFacadeService {
  private readonly downloadService = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);

  public async downloadDocument(document: FileDocument): Promise<void> {
    if (!document.url) {
      this.showNotification('Error de descarga', 'No existe una URL válida vinculada a este archivo.', NotificationType.ERROR);
      return;
    }
    try {
      await this.downloadService.download(document.url, `${document.name}.pdf`);
    } catch (err) {
      console.error(`Error al descargar el documento ${document.name}:`, err);
      this.showNotification('Error de descarga', `No se pudo descargar ${document.name}. Intente más tarde.`, NotificationType.ERROR);
    }
  }

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
