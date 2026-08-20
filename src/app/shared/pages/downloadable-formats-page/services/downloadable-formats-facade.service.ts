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

    // ← useBlob: true (antes false). Estos son archivos estáticos de tu
    // propio origen (assets/formatos/) — caso ideal para el modo blob:
    // sin problema de CORS (mismo origen), tamaño modesto, y sobre todo
    // sí detecta un 404 real vía HttpClient.
    //
    // IMPORTANTE, corrigiendo mi propio comentario anterior sobre este
    // catch: no lo restauro con try/catch aquí, porque FileDownloadService
    // YA captura y notifica internamente cualquier error del modo blob
    // (turno de hace varios mensajes) — y NO relanza ese error. La
    // promesa de download() siempre se resuelve, nunca se rechaza, así
    // que un try/catch en este punto seguiría siendo inalcanzable, ahora
    // por una razón distinta a la original. El aviso de "no se pudo
    // descargar" que verá el usuario si falta un archivo lo emite
    // FileDownloadService directamente (mensaje genérico, no el
    // específico de este facade) — pero el efecto práctico que
    // necesitas ya queda cubierto: error visible en vez de silencio.
    await this.downloadService.download(format.url, `${formatCode}.pdf`, true);
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
