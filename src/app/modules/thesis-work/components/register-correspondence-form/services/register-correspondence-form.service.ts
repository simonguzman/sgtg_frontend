import { inject, Injectable } from '@angular/core';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';

/** Datos, descargas y avisos del formulario de la versión definitiva. */
@Injectable()
export class RegisterCorrespondenceFormService {
  private readonly downloadService = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);
  private readonly participants = inject(ThesisParticipantsFormatterService);

  /** Nombres de los estudiantes del trabajo. */
  getStudentNames(thesisWork: ThesisWork): string {
    const authors = thesisWork.preliminaryDraftData?.proposalData?.authors;
    return authors ? this.participants.getStudentNames(thesisWork) : 'Sin estudiantes asignados';
  }

  /** Nombre del director. */
  getDirectorName(thesisWork: ThesisWork): string   { return this.participants.getDirectorName(thesisWork); }
  /** Nombre del codirector, o vacío si no tiene. */
  getCodirectorName(thesisWork: ThesisWork): string { return this.participants.getCodirectorName(thesisWork); }
  /** Nombre del asesor, o vacío si no tiene. */
  getAdvisorName(thesisWork: ThesisWork): string     { return this.participants.getAdvisorName(thesisWork); }
  /** Nombre completo de un participante por su id. */
  getMemberName(id: string | undefined): string      { return this.participants.getMemberName(id); }
  /** Jurados asignados a la sesión de sustentación actual. */
  getAssignedJurors(thesisWork: ThesisWork): string {
    return this.participants.getAssignedJurors(thesisWork.sustentations?.[0]);
  }

  /** Descarga un documento del trabajo. */
  async downloadDocument(document: FileDocument | undefined | null): Promise<void> {
    if (!document?.url) {
      this.notificationService.show({
        title: 'Archivo no disponible',
        message: 'El documento solicitado no cuenta con una URL válida.',
        type: NotificationType.ERROR
      });
      return;
    }
    try {
      await this.downloadService.download(document.url, document.name);
    } catch (err) {
      console.error(`Error al descargar el documento ${document.name}:`, err);
      this.notificationService.show({
        title: 'Error de descarga',
        message: `No se pudo descargar ${document.name}. Intente más tarde.`,
        type: NotificationType.ERROR
      });
    }
  }
}
