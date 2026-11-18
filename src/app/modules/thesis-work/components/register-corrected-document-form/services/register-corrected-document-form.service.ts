import { inject, Injectable } from '@angular/core';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';

/** Datos y avisos del formulario de radicación de los ajustes. */
@Injectable()
export class RegisterCorrectedDocumentFormService {
  private readonly notificationService = inject(NotificationService);
  private readonly participants = inject(ThesisParticipantsFormatterService);

  /** Nombres de los estudiantes del trabajo. */
  getStudentNames(thesisWork: ThesisWork): string { return this.participants.getStudentNames(thesisWork); }
  /** Nombre del director. */
  getDirectorName(thesisWork: ThesisWork): string { return this.participants.getDirectorName(thesisWork); }
  /** Nombre del codirector, o vacío si no tiene. */
  getCodirectorName(thesisWork: ThesisWork): string { return this.participants.getCodirectorName(thesisWork); }
  /** Nombre del asesor, o vacío si no tiene. */
  getAdvisorName(thesisWork: ThesisWork): string { return this.participants.getAdvisorName(thesisWork); }

  /** Muestra el aviso «Archivo adjunto». */
  notifyFileAttached(fileName: string): void {
    this.notificationService.show({
      title: 'Archivo adjunto',
      message: `El documento ${fileName} se ha adjuntado correctamente.`,
      type: NotificationType.INFO
    });
  }

  /** Muestra el aviso «Documentos faltantes». */
  notifyMissingDocuments(): void {
    this.notificationService.show({
      title: 'Documentos faltantes',
      message: 'Debe adjuntar obligatoriamente la monografía corregida para continuar.',
      type:NotificationType.ERROR
    });
  }
}
