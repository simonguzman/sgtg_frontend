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
  private readonly thesisWorkService   = inject(ThesisWorkService);
  private readonly authService         = inject(AuthService);
  private readonly participants        = inject(ThesisParticipantsFormatterService);
  private readonly downloadService     = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);

  findThesisWork(id: string | null, allWorks: ThesisWork[]): ThesisWork | null {
    if (!id) return null;
    return allWorks.find(w => w.thesisWorkId === id) ?? null;
  }

  isDirector(thesis: ThesisWork | null): boolean {
    const user = this.authService.currentUser();
    return thesis?.preliminaryDraftData?.proposalData?.director?.id === user?.id;
  }

  isJuror(thesis: ThesisWork | null): boolean {
    const user = this.authService.currentUser();
    if (!thesis?.sustentations?.[0] || !user) return false;
    return thesis.sustentations[0].assignedJurors?.some(j => j.id === user.id) ?? false;
  }

  canDirectorUpload(thesis: ThesisWork | null, isDirector: boolean, isArchived: boolean): boolean {
    if (isArchived || !isDirector) return false;
    const deliveries = thesis?.correctedDeliveries ?? [];
    if (deliveries.length === 0) return true;
    const latestStatus = deliveries[0].status ?? deliveries[0].monograph?.status;
    return latestStatus === stateList.NO_APROBADO || latestStatus === stateList.APLAZADO;
  }

  canJurorEvaluate(thesis: ThesisWork | null, isJuror: boolean, isArchived: boolean): boolean {
    if (isArchived || !isJuror) return false;
    const deliveries = thesis?.correctedDeliveries ?? [];
    if (deliveries.length === 0) return true;
    const latestStatus = deliveries[0].status ?? deliveries[0].monograph?.status;
    return latestStatus === stateList.EN_REVISION;
  }

  buildTableData(thesis: ThesisWork | null): CorrectedDeliveryTableRow[] {
    if (!thesis?.correctedDeliveries) return [];
    return thesis.correctedDeliveries.map((delivery, index) => ({
      id:     delivery.id,
      name:   `Paquete de Correcciones Radicado ${index + 1}`,
      date:   delivery.uploadDate ?? 'Sin fecha',
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

  getStudentName(thesis: ThesisWork | null): string {
    return this.participants.getStudentNames(thesis);
  }
  getDirectorName(thesis: ThesisWork | null): string {
    return this.participants.getDirectorName(thesis);
  }
  getCodirectorName(thesis: ThesisWork | null): string | undefined {
    return this.participants.getCodirectorName(thesis) || undefined;
  }
  getAdvisorName(thesis: ThesisWork | null): string | undefined {
    return this.participants.getAdvisorName(thesis) || undefined;
  }

  // ← FIX: async + try/catch, mismo patrón ya aplicado al resto de
  // descargas del proyecto. Antes era "fire and forget" sin await.
  async downloadDocumentByName(delivery: CorrectedDelivery | null, fileName: string): Promise<void> {
    if (!delivery) return;
    const target = delivery.monograph?.name === fileName ? delivery.monograph
      : delivery.annexes?.name === fileName ? delivery.annexes
      : undefined;
    if (target) await this.downloadDocument(target);
  }

  private async downloadDocument(doc: FileDocument): Promise<void> {
    if (!doc.url) {
      this.showNotification('Error de descarga', 'No existe un enlace de descarga válido para este archivo.', NotificationType.ERROR);
      return;
    }
    try {
      await this.downloadService.download(doc.url, `${doc.name}.pdf`);
    } catch (err) {
      console.error(`Error al descargar el documento ${doc.name}:`, err);
      this.showNotification('Error de descarga', `No se pudo descargar ${doc.name}. Intente más tarde.`, NotificationType.ERROR);
    }
  }

  showNavigationError(): void {
    this.showNotification('Error de navegación', 'No se pudo identificar el código del trabajo de grado actual.', NotificationType.ERROR);
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
