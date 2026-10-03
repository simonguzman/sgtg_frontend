import { inject, Injectable } from '@angular/core';
import { FileDownloadService } from '../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../components/notifications/services/notification.service';
import { NotificationType } from '../../../components/notifications/models/notification.model';
import { DownloadableFormat } from '../models/downloadable-formats-page.model';

@Injectable({ providedIn: 'root' })
export class DownloadableFormatsFacadeService {
  private readonly downloadService = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);

  public async downloadFormat(format: DownloadableFormat): Promise<void> {
    const formatCode = format.id.toUpperCase();

    if (!format.url?.trim()) {
      this.showNotification('Error de descarga', 'La ruta del archivo no es válida o está vacía.', NotificationType.ERROR);
      return;
    }

    this.showNotification(
      'Descarga en curso',
      `Iniciando la descarga del ${formatCode}. Revise su carpeta de descargas.`,
      NotificationType.INFO
    );
    await this.downloadService.download(format.url, `${formatCode}.pdf`, true);
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
