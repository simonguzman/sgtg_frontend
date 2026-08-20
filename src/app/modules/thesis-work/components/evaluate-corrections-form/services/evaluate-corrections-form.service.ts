import { inject, Injectable } from '@angular/core';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { CorrectedDelivery } from '../../../interfaces/corrected-delivery.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { Evaluation } from '../../../../../core/interfaces/evaluation.interface';
import { stateList } from '../../../../../core/enums/state.enum';

const MIN_OBSERVATIONS_LENGTH = 10;

@Injectable()
export class EvaluateCorrectionsFormService {
  private readonly notificationService = inject(NotificationService);
  private readonly downloadService     = inject(FileDownloadService);
  private readonly authService         = inject(AuthService);
  private readonly participants        = inject(ThesisParticipantsFormatterService);

  getStudentNames(thesisWork: ThesisWork): string   { return this.participants.getStudentNames(thesisWork); }
  getDirectorName(thesisWork: ThesisWork): string   { return this.participants.getDirectorName(thesisWork); }
  getCodirectorName(thesisWork: ThesisWork): string { return this.participants.getCodirectorName(thesisWork); }
  getAdvisorName(thesisWork: ThesisWork): string     { return this.participants.getAdvisorName(thesisWork); }

  getAssignedJurors(thesisWork: ThesisWork): string {
    return this.participants.getAssignedJurors(thesisWork.sustentations?.[0]);
  }

  isObservationsValid(observations: string): boolean {
    return observations.trim().length >= MIN_OBSERVATIONS_LENGTH;
  }

  buildEvaluationPayload(
    thesisWork: ThesisWork,
    verdict: stateList,
    observations: string,
    correctedDeliveries: CorrectedDelivery[]
  ): Omit<Evaluation, 'id' | 'date'> {
    const currentUser      = this.authService.currentUser();
    const targetDocumentId = correctedDeliveries[0]?.monograph?.id ?? '';
    return {
      documentId:    targetDocumentId,
      proposalId:    thesisWork.preliminaryDraftData?.proposalData?.id ?? '',
      evaluatorId:   currentUser?.id ?? '',
      evaluatorName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Jurado Asignado',
      evaluatorRole: 'JURADO',
      veredict:      verdict,
      observations
    };
  }

  // ← FIX: async + try/catch — mismo patrón ya aplicado al resto de
  // descargas del proyecto. Antes era "fire and forget" sin await.
  async downloadDocument(doc: FileDocument): Promise<void> {
    if (!doc?.url) {
      this.notificationService.show({
        title: 'Error de archivo',
        message: 'Este documento no posee una ruta válida de descarga.',
        type: NotificationType.ERROR
      });
      return;
    }
    try {
      await this.downloadService.download(doc.url, `${doc.name}.pdf`);
    } catch (err) {
      console.error(`Error al descargar el documento ${doc.name}:`, err);
      this.notificationService.show({
        title: 'Error de descarga',
        message: `No se pudo descargar ${doc.name}. Intente más tarde.`,
        type: NotificationType.ERROR
      });
    }
  }

  notifyFileAttached(): void {
    this.notificationService.show({
      title: 'Acta Adjunta',
      message: 'El Formato_G se ha vinculado correctamente a la evaluación.',
      type: NotificationType.INFO
    });
  }
  notifyMissingVerdict(): void {
    this.notificationService.show({
      title: 'Dictamen requerido',
      message: 'Debe seleccionar una decisión de evaluación.',
      type: NotificationType.ERROR
    });
  }
  notifyInvalidObservations(): void {
    this.notificationService.show({
      title:   'Observaciones vacías',
      message: `Debe ingresar una justificación técnica detallada (mínimo ${MIN_OBSERVATIONS_LENGTH} caracteres).`,
      type:    NotificationType.ERROR
    });
  }
  notifyMissingFormatG(): void {
    this.notificationService.show({
      title: 'Formato_G Faltante',
      message: 'Es obligatorio cargar el Formato_G firmado para continuar.',
      type: NotificationType.ERROR
    });
  }
}
