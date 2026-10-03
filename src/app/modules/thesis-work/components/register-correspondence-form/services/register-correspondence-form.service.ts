import { inject, Injectable } from '@angular/core';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';

@Injectable()
export class RegisterCorrespondenceFormService {
  private readonly downloadService = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);
  private readonly participants = inject(ThesisParticipantsFormatterService);

  getStudentNames(thesisWork: ThesisWork): string {
    const authors = thesisWork.preliminaryDraftData?.proposalData?.authors;
    return authors ? this.participants.getStudentNames(thesisWork) : 'Sin estudiantes asignados';
  }

  getDirectorName(thesisWork: ThesisWork): string   { return this.participants.getDirectorName(thesisWork); }
  getCodirectorName(thesisWork: ThesisWork): string { return this.participants.getCodirectorName(thesisWork); }
  getAdvisorName(thesisWork: ThesisWork): string     { return this.participants.getAdvisorName(thesisWork); }
  getMemberName(id: string | undefined): string      { return this.participants.getMemberName(id); }
  getAssignedJurors(thesisWork: ThesisWork): string {
    return this.participants.getAssignedJurors(thesisWork.sustentations?.[0]);
  }

  findFormatoE(documents: FileDocument[]): FileDocument | undefined {
    return documents.find(document => document.type === DocumentType.FORMATO_E);
  }

  findFormatoF(documents: FileDocument[]): FileDocument | undefined {
    return documents.find(document =>
      document.type === DocumentType.PAZ_Y_SALVO || (document.type as string) === 'Formato F'
    );
  }

  findFormatoG(documents: FileDocument[]): FileDocument | undefined {
    const correctionDoc = documents.find(document =>
      document.type === DocumentType.CORRECCION || (document.type as string) === 'CORRECCION'
    );
    return correctionDoc ?? documents.find(document => document.type === DocumentType.FORMATO_G);
  }

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

  notifyInvalidFileType(): void {
    this.notificationService.show({
      title: 'Formato inválido',
      message: 'Solo se permiten archivos en formato PDF.',
      type: NotificationType.ERROR
    });
  }
}
