import { inject, Injectable, signal } from '@angular/core';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { SustentationDetailsMapperService } from './sustentation-details-mapper.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { SustentationDetailsView } from '../models/sustentation-details.model';

@Injectable({ providedIn: 'root' })
export class SustentationDetailsFacadeService {
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly mapper = inject(SustentationDetailsMapperService);
  private readonly downloadService = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);

  public readonly viewData = signal<SustentationDetailsView | null>(null);
  public readonly isLoading = signal<boolean>(true);

  public loadDetails(thesisWorkId: string, sustentationId: string): void {
    this.isLoading.set(true);
    this.thesisWorkService.getThesisWorkByIdMock(thesisWorkId).subscribe({
      next: (foundData) => {
        if (foundData) {
          const mappedData = this.mapper.mapToView(foundData, sustentationId);
          if (mappedData) {
            this.viewData.set(mappedData);
          } else {
            this.showError('No encontrado', 'Sustentación no encontrada en el registro.');
          }
        } else {
          this.showError('No encontrado', 'Trabajo no registrado.');
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.showError('Error', 'Error de comunicación.');
        this.isLoading.set(false);
      }
    });
  }

  public downloadDocument(url?: string, name?: string): void {
    if (!url) {
      this.showError('Error', 'Documento no encontrado o ruta inválida.');
      return;
    }
    this.downloadService.download(url, name || 'documento');
  }

  public showError(title: string, message: string): void {
    this.notificationService.show({ title, message, type: NotificationType.ERROR });
  }
}
