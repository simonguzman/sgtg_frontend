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
  private readonly downloadService     = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);
  private readonly participants        = inject(ThesisParticipantsFormatterService);

  // Se conserva el chequeo original de 'authors' antes de delegar, porque este
  // componente en particular mostraba un mensaje distinto ('Sin estudiantes
  // asignados') cuando el arreglo era undefined — el resto de participantes
  // sí delega completamente en el formateador compartido.
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

  /**
   * Resuelve el Formato_E de la entrega final.
   * Se eliminó la comparación redundante `doc.type === 'Formato_E' as any`:
   * DocumentType.FORMATO_E ya vale exactamente 'Formato_E', así que la
   * segunda mitad comparaba el mismo valor dos veces sin cobertura extra.
   */
  findFormatoE(documents: FileDocument[]): FileDocument | undefined {
    return documents.find(doc => doc.type === DocumentType.FORMATO_E);
  }

  /**
   * Resuelve el documento de Paz y Salvo. Se conserva el chequeo contra el
   * string legacy 'Formato F' (con espacio, distinto del valor real del enum
   * 'Paz_y_salvo') por si existen registros antiguos con ese literal — solo
   * se acota el cast de `any` a `string`.
   */
  findFormatoF(documents: FileDocument[]): FileDocument | undefined {
    return documents.find(doc =>
      doc.type === DocumentType.PAZ_Y_SALVO || (doc.type as string) === 'Formato F'
    );
  }

  /**
   * Prioriza el acta de la evaluación de correcciones; si no existe, cae al
   * Formato_G original de la sustentación. Se conserva el chequeo contra
   * 'CORRECCION' en mayúsculas (distinto del valor real 'Correccion') por
   * compatibilidad legacy. Se eliminó la comparación redundante 'Formato_G'
   * (idéntica al valor del enum).
   */
  findFormatoG(documents: FileDocument[]): FileDocument | undefined {
    const correctionDoc = documents.find(doc =>
      doc.type === DocumentType.CORRECCION || (doc.type as string) === 'CORRECCION'
    );
    return correctionDoc ?? documents.find(doc => doc.type === DocumentType.FORMATO_G);
  }

  // ← FIX: async + try/catch, mismo patrón que el resto del proyecto.
  async downloadDocument(doc: FileDocument | undefined | null): Promise<void> {
    if (!doc?.url) {
      this.notificationService.show({
        title: 'Archivo no disponible',
        message: 'El documento solicitado no cuenta con una URL válida.',
        type: NotificationType.ERROR
      });
      return;
    }
    try {
      await this.downloadService.download(doc.url, doc.name);
    } catch (err) {
      console.error(`Error al descargar el documento ${doc.name}:`, err);
      this.notificationService.show({
        title: 'Error de descarga',
        message: `No se pudo descargar ${doc.name}. Intente más tarde.`,
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
