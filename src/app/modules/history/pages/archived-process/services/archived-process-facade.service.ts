import { inject, Injectable } from '@angular/core';
import { UserService } from '../../../../users/services/user.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ArchivedRecordResolverService, ArchivedRecordType } from './archived-record-resolver.service';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { ArchivedRecordView } from '../interfaces/archived-record-view.interface';

@Injectable({ providedIn: 'root' })
export class ArchivedProcessFacadeService {
  private readonly resolver = inject(ArchivedRecordResolverService);
  private readonly userService = inject(UserService);
  private readonly downloadService = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);

  loadRecord(type: ArchivedRecordType, id: string): ArchivedRecordView | null {
    const resolution = this.resolver.resolve(type, id);
    if (!resolution) return null;
    const { baseProposal, state, documents } = resolution;
    return {
      title: baseProposal.title || 'Sin título registrado',
      modality: baseProposal.modality || 'No definida',
      status: state || 'Desconocido',
      studentName: this.userService.getAuthorsNames(baseProposal.authors) || 'Sin estudiante asignado',
      directorName: baseProposal.director
        ? this.userService.formatFullName(baseProposal.director)
        : 'Sin director asignado',
      codirectorName: baseProposal.codirector
        ? this.userService.formatFullName(baseProposal.codirector)
        : undefined,
      advisorName: baseProposal.advisor
        ? this.userService.formatFullName(baseProposal.advisor)
        : undefined,
      documents
    };
  }

  showNotFoundError(): void {
    this.notificationService.show({
      title: 'Registro no encontrado',
      message: 'No se pudo cargar la información histórica solicitada.',
      type: NotificationType.ERROR
    });
  }

  showInvalidRouteError(): void {
    this.notificationService.show({
      title: 'Ruta inválida',
      message: 'No se pudo identificar el tipo o el identificador del registro histórico.',
      type: NotificationType.ERROR
    });
  }

  // ← FIX: async + try/catch, mismo patrón aplicado en todo el resto del
  // proyecto. Antes era "fire and forget" sin await ni manejo de error.
  async downloadDocument(document: FileDocument): Promise<void> {
    if (!document.url) {
      this.notificationService.show({
        title: 'Error de descarga',
        message: 'No existe una URL válida vinculada a este archivo histórico.',
        type: NotificationType.ERROR
      });
      return;
    }
    try {
      await this.downloadService.download(document.url, `${document.name}.pdf`);
    } catch (err) {
      console.error(`Error al descargar el documento histórico ${document.name}:`, err);
      this.notificationService.show({
        title: 'Error de descarga',
        message: `No se pudo descargar ${document.name}. Intente más tarde.`,
        type: NotificationType.ERROR
      });
    }
  }
}
