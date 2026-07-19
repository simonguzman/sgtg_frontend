import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FileDownloadService {

  private readonly http = inject(HttpClient);

  async download(url: string, fileName: string, useBlob: boolean = false): Promise<void> {
    if (!useBlob) {
      this.directDownload(url, fileName);
      return;
    }

    try {
      const blob = await firstValueFrom(this.http.get(url, { responseType: 'blob' }));
      const objectUrl = window.URL.createObjectURL(blob);
      this.directDownload(objectUrl, fileName);
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Error al descargar el archivo:', error);
      // Aquí podrías inyectar tu NotificationService para mostrar el error
    }
  }

  private directDownload(url: string, fileName: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    link.click();
    link.remove();
  }

}
