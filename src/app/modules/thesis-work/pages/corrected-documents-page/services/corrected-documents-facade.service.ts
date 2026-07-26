import { inject, Injectable } from '@angular/core';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { UserService } from '../../../../users/services/user.service';
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
  // ← Cambiado de UserFormatterService (inyección directa a un sub-servicio)
  // a UserService: la fachada del módulo Users ya expone formatFullName y
  // getAuthorsNames precisamente para evitar que otros módulos rompan la
  // encapsulación accediendo a sub-servicios internos.
  private readonly userService         = inject(UserService);
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
    return this.userService.getAuthorsNames(
      thesis?.preliminaryDraftData?.proposalData?.authors
    ) || 'Sin estudiante';
  }

  getDirectorName(thesis: ThesisWork | null): string {
    const director = thesis?.preliminaryDraftData?.proposalData?.director;
    return director ? this.userService.formatFullName(director) : 'Sin director';
  }

  getCodirectorName(thesis: ThesisWork | null): string | undefined {
    const codirector = thesis?.preliminaryDraftData?.proposalData?.codirector;
    return codirector ? this.userService.formatFullName(codirector) : undefined;
  }

  getAdvisorName(thesis: ThesisWork | null): string | undefined {
    const advisor = thesis?.preliminaryDraftData?.proposalData?.advisor;
    return advisor ? this.userService.formatFullName(advisor) : undefined;
  }

  downloadDocumentByName(delivery: CorrectedDelivery | null, fileName: string): void {
    if (!delivery) return;
    const target = delivery.monograph?.name === fileName ? delivery.monograph
      : delivery.annexes?.name === fileName ? delivery.annexes
      : undefined;
    if (target) this.downloadDocument(target);
  }

  private downloadDocument(doc: FileDocument): void {
    if (!doc.url) {
      this.showNotification('Error de descarga', 'No existe un enlace de descarga válido para este archivo.', NotificationType.ERROR);
      return;
    }
    this.downloadService.download(doc.url, `${doc.name}.pdf`);
  }

  showNavigationError(): void {
    this.showNotification('Error de navegación', 'No se pudo identificar el código del trabajo de grado actual.', NotificationType.ERROR);
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
