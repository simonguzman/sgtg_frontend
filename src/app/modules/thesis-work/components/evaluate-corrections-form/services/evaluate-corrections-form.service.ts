import { inject, Injectable } from '@angular/core';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';

const MIN_OBSERVATIONS_LENGTH = 10;

/** Datos, validaciones y avisos del formulario de verificación de los ajustes. */
@Injectable()
export class EvaluateCorrectionsFormService {
  private readonly notificationService = inject(NotificationService);
  private readonly downloadService = inject(FileDownloadService);
  private readonly participants = inject(ThesisParticipantsFormatterService);

  /** Nombres de los estudiantes del trabajo. */
  getStudentNames(thesisWork: ThesisWork): string   { return this.participants.getStudentNames(thesisWork); }
  /** Nombre del director. */
  getDirectorName(thesisWork: ThesisWork): string   { return this.participants.getDirectorName(thesisWork); }
  /** Nombre del codirector, o vacío si no tiene. */
  getCodirectorName(thesisWork: ThesisWork): string { return this.participants.getCodirectorName(thesisWork); }
  /** Nombre del asesor, o vacío si no tiene. */
  getAdvisorName(thesisWork: ThesisWork): string     { return this.participants.getAdvisorName(thesisWork); }

  /** Jurados asignados a la sesión de sustentación actual. */
  getAssignedJurors(thesisWork: ThesisWork): string {
    return this.participants.getAssignedJurors(thesisWork.sustentations?.[0]);
  }

  /** @returns true si las observaciones tienen la longitud mínima */
  isObservationsValid(observations: string): boolean {
    return observations.trim().length >= MIN_OBSERVATIONS_LENGTH;
  }

  /** Descarga un documento de los ajustes. */
  async downloadDocument(document: FileDocument): Promise<void> {
    if (!document?.url) {
      this.notificationService.show({
        title: 'Error de archivo',
        message: 'Este documento no posee una ruta válida de descarga.',
        type: NotificationType.ERROR
      });
      return;
    }
    try {
      await this.downloadService.download(document.url, `${document.name}.pdf`);
    } catch (err) {
      console.error(`Error al descargar el documento ${document.name}:`, err);
      this.notificationService.show({
        title: 'Error de descarga',
        message: `No se pudo descargar ${document.name}. Intente más tarde.`,
        type: NotificationType.ERROR
      });
    }
  }

  /** Muestra el aviso «Dictamen requerido». */
  notifyMissingVerdict(): void {
    this.notificationService.show({
      title: 'Dictamen requerido',
      message: 'Debe seleccionar una decisión de evaluación.',
      type: NotificationType.ERROR
    });
  }
  /** Muestra el aviso «Observaciones vacías». */
  notifyInvalidObservations(): void {
    this.notificationService.show({
      title: 'Observaciones vacías',
      message: `Si los ajustes no cumplen, debe ingresar una justificación detallada (mínimo ${MIN_OBSERVATIONS_LENGTH} caracteres).`,
      type: NotificationType.ERROR
    });
  }
}
