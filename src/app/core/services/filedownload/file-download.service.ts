import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../shared/components/notifications/models/notification.model';
import { environment } from '../../../../environments/environment';

// Margen antes de liberar la Object URL del blob descargado — ver
// comentario en el catch de download().
const REVOKE_OBJECT_URL_DELAY_MS = 100;

@Injectable({
  providedIn: 'root'
})
export class FileDownloadService {
  private readonly http = inject(HttpClient);
  // ← NUEVO: cierra el TODO que el propio código dejaba pendiente. Antes,
  // un fallo de red al descargar por blob solo se registraba en consola
  // — el usuario nunca se enteraba de que la descarga había fallado.
  private readonly notificationService = inject(NotificationService);

  /**
   * Descarga un archivo. Los del backend (`environment.apiUrl`) se piden
   * siempre como blob por HttpClient, para que el interceptor envíe el token.
   */
  async download(url: string, fileName: string, useBlob: boolean = false): Promise<void> {
    const esDelBackend = url.startsWith(environment.apiUrl);
    if (!useBlob && !esDelBackend) {
      this.directDownload(url, fileName);
      return;
    }

    try {
      const blob = await firstValueFrom(this.http.get(url, { responseType: 'blob' }));
      const objectUrl = window.URL.createObjectURL(blob);
      // Los archivos del backend se guardan con su nombre (ej. "Formato A - v2.pdf"): se descargan con ese nombre
      this.directDownload(objectUrl, (esDelBackend ? nombreEnElServidor(url) : null)
        ?? nombreConExtension(fileName, blob.type));

      // ← FIX: revocar en el mismo tick que el click() puede cancelar la
      // descarga en navegadores que aún no terminaron de leer el blob
      // desde esa URL. Se difiere para dar margen al navegador.
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

  private directDownload(url: string, fileName: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    // ← FIX: se inserta en el DOM antes del click() — necesario para que
    // Firefox respete el atributo `download` de forma confiable.
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
