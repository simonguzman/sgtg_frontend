import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../shared/components/notifications/models/notification.model';
import { environment } from '../../../../environments/environment';

/** Espera antes de liberar la URL del archivo descargado, para que el navegador termine de leerlo. */
const REVOKE_OBJECT_URL_DELAY_MS = 100;

/** Descarga de archivos del backend y de los formatos estáticos, con aviso al usuario si falla. */
@Injectable({
  providedIn: 'root'
})
export class FileDownloadService {
  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);

  /**
   * Descarga un archivo. Los del backend (`environment.apiUrl`) se piden siempre como blob por HttpClient,
   * para que el interceptor envíe el token, y se guardan con el nombre que tienen en el servidor.
   * @param url dirección del archivo
   * @param fileName nombre con que se guarda si el servidor no da uno
   * @param useBlob descarga también como blob un archivo que no es del backend
   */
  async download(url: string, fileName: string, useBlob = false): Promise<void> {
    const esDelBackend = url.startsWith(environment.apiUrl);
    if (!useBlob && !esDelBackend) {
      this.directDownload(url, fileName);
      return;
    }

    try {
      const blob = await firstValueFrom(this.http.get(url, { responseType: 'blob' }));
      const objectUrl = window.URL.createObjectURL(blob);
      this.directDownload(objectUrl, (esDelBackend ? nombreEnElServidor(url) : null)
        ?? nombreConExtension(fileName, blob.type));

      setTimeout(() => window.URL.revokeObjectURL(objectUrl), REVOKE_OBJECT_URL_DELAY_MS);
    } catch (error) {
      console.error('Error al descargar el archivo:', error);
      this.showNotification(
        'Error de descarga',
        `No fue posible descargar "${fileName}". Verifique su conexión e inténtelo nuevamente.`,
        NotificationType.ERROR
      );
    }
  }

  /** Descarga con un enlace temporal; se agrega al documento porque Firefox lo exige para respetar `download`. */
  private directDownload(url: string, fileName: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}

/**
 * Nombre de descarga sin extensiones repetidas (`x.pdf.pdf`) y con `.pdf`
 * cuando el archivo es PDF y el nombre no trae extensión.
 */
export function nombreConExtension(fileName: string, tipo: string): string {
  const sinDuplicado = fileName.replace(/(\.pdf)+$/i, '.pdf');
  if (tipo === 'application/pdf' && !/\.[a-z0-9]{2,4}$/i.test(sinDuplicado)) {
    return `${sinDuplicado}.pdf`;
  }
  return sinDuplicado;
}

/** Nombre del archivo en el servidor: último segmento del parámetro `ruta` de la URL de descarga. */
export function nombreEnElServidor(url: string): string | null {
  try {
    const ruta = new URL(url, window.location.origin).searchParams.get('ruta');
    return ruta ? ruta.split('/').pop() || null : null;
  } catch {
    return null;
  }
}
