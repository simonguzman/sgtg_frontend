import { inject, Injectable } from '@angular/core';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { CorrectedDelivery } from '../../../interfaces/corrected-delivery.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { CorrectedDeliveryTableRow } from '../models/corrected-documents-page.model';

@Injectable({ providedIn: 'root' })
export class CorrectedDocumentsFacadeService {
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly authService = inject(AuthService);
  private readonly participants = inject(ThesisParticipantsFormatterService);
  private readonly downloadService = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);

  findThesisWork(id: string | null, allThesisWorks: ThesisWork[]): ThesisWork | null {
    if (!id) return null;
    return allThesisWorks.find(thesisWork => thesisWork.thesisWorkId === id) ?? null;
  }

  isDirector(thesisWork: ThesisWork | null): boolean {
    const user = this.authService.currentUser();
    return thesisWork?.preliminaryDraftData?.proposalData?.director?.id === user?.id;
  }

  isJuror(thesisWork: ThesisWork | null): boolean {
    const user = this.authService.currentUser();
    if (!thesisWork?.sustentations?.[0] || !user) return false;
    return thesisWork.sustentations[0].assignedJurors?.some(juror => juror.id === user.id) ?? false;
  }

  canDirectorUpload(thesisWork: ThesisWork | null, isDirector: boolean, isArchived: boolean): boolean {
    if (isArchived || !isDirector) return false;
    const deliveries = thesisWork?.correctedDeliveries ?? [];
    if (deliveries.length === 0) return true;
    const latestStatus = deliveries[0].status ?? deliveries[0].monograph?.status;
    return latestStatus === stateList.NO_APROBADO || latestStatus === stateList.APLAZADO;
  }

  canJurorEvaluate(thesisWork: ThesisWork | null, isJuror: boolean, isArchived: boolean): boolean {
    if (isArchived || !isJuror) return false;
    const deliveries = thesisWork?.correctedDeliveries ?? [];
    if (deliveries.length === 0) return true;
    const latestStatus = deliveries[0].status ?? deliveries[0].monograph?.status;
    return latestStatus === stateList.EN_REVISION;
  }

  buildTableData(thesisWork: ThesisWork | null): CorrectedDeliveryTableRow[] {
    if (!thesisWork?.correctedDeliveries) return [];
    return thesisWork.correctedDeliveries.map((delivery, index) => ({
      id: delivery.id,
      name: `Paquete de Correcciones Radicado ${index + 1}`,
      date: delivery.uploadDate ?? 'Sin fecha',
      status: delivery.status ?? delivery.monograph?.status ?? stateList.EN_REVISION,
      allowedActions: ['view-details'],
      rawDelivery: delivery
    }));
  }

  getDeliveryDocumentNames(delivery: CorrectedDelivery | null): string[] {
    if (!delivery) return [];
    const docs: string[] = [];
    if (delivery.monograph?.name) docs.push(delivery.monograph.name);
    if (delivery.annexes?.name)   docs.push(delivery.annexes.name);
    return docs;
  }

  getStudentName(thesisWork: ThesisWork | null): string {
    return this.participants.getStudentNames(thesisWork);
  }

  getDirectorName(thesisWork: ThesisWork | null): string {
    return this.participants.getDirectorName(thesisWork);
  }

  getCodirectorName(thesisWork: ThesisWork | null): string | undefined {
    return this.participants.getCodirectorName(thesisWork) || undefined;
  }

  getAdvisorName(thesisWork: ThesisWork | null): string | undefined {
    return this.participants.getAdvisorName(thesisWork) || undefined;
  }

  async downloadDocumentByName(delivery: CorrectedDelivery | null, fileName: string): Promise<void> {
    if (!delivery) return;

    let target: FileDocument | undefined;

    if (delivery.monograph?.name === fileName) {
      target = delivery.monograph;
    } else if (delivery.annexes?.name === fileName) {
      target = delivery.annexes;
    }

    if (target) {
      await this.downloadDocument(target);
    }
  }

  private async downloadDocument(document: FileDocument): Promise<void> {
    if (!document.url) {
      this.showNotification('Error de descarga', 'No existe un enlace de descarga válido para este archivo.', NotificationType.ERROR);
      return;
    }
    try {
      await this.downloadService.download(document.url, `${document.name}.pdf`);
    } catch (err) {
      console.error(`Error al descargar el documento ${document.name}:`, err);
      this.showNotification('Error de descarga', `No se pudo descargar ${document.name}. Intente más tarde.`, NotificationType.ERROR);
    }
  }

  showNavigationError(): void {
    this.showNotification('Error de navegación', 'No se pudo identificar el código del trabajo de grado actual.', NotificationType.ERROR);
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
