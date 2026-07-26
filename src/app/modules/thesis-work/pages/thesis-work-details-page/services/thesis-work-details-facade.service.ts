import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { ThesisWorkDetailsMapperService } from './thesis-work-details-mapper.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWorkDetailsView } from '../models/thesis-work-details-page.model';

@Injectable({ providedIn: 'root' })
export class ThesisWorkDetailsFacadeService {
  private readonly router = inject(Router);
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly mapper = inject(ThesisWorkDetailsMapperService);
  private readonly downloadService = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);

  public readonly details = signal<ThesisWorkDetailsView | null>(null);
  public readonly isLoading = signal<boolean>(true);

  public loadThesisWorkDetails(id: string): void {
    this.isLoading.set(true);
    this.thesisWorkService.getThesisWorkByIdMock(id).subscribe({
      next: (foundData) => {
        if (foundData) {
          this.details.set(this.mapper.mapToView(foundData));
        } else {
          this.showNotification('Registro inexistente', 'El trabajo de grado solicitado no se encuentra registrado en el sistema.', NotificationType.ERROR);
          this.goBack();
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error al recuperar detalles:', error);
        this.showNotification('Error de comunicación', 'Hubo un problema al conectar con el repositorio.', NotificationType.ERROR);
        this.goBack();
        this.isLoading.set(false);
      }
    });
  }

  public downloadDocument(): void {
    const document = this.details()?.mainDocument;
    if (!document?.url) {
      this.showNotification('Archivo no disponible', 'No se encontró un documento raíz válido vinculado.', NotificationType.ERROR);
      return;
    }

    this.showNotification('Iniciando transferencia', 'Localizando y preparando el documento para su descarga...', NotificationType.INFO);
    this.downloadService.download(document.url, document.name);
    this.showNotification('Descarga exitosa', 'El archivo original se ha guardado en su equipo.', NotificationType.CONFIRMATION);
  }

  public goBack(): void {
    const currentUrl = this.router.url;
    if (currentUrl.includes('/history')) {
      this.router.navigate(['/history']);
    } else {
      this.router.navigate(['/thesis-work']);
    }
  }

  public handleMissingId(): void {
    this.showNotification('Identificador faltante', 'No se pudo procesar la solicitud debido a un ID inválido.', NotificationType.ERROR);
    this.goBack();
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
