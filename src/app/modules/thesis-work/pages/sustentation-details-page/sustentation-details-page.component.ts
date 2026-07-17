import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ThesisWorkService } from '../../services/thesis-work.service';
import { UserService } from '../../../users/services/user.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { FileDownloadService } from '../../../../core/services/filedownload/file-download.service';
import { JurorVerdict, ThesisWork, SustentationRegistry, SustentationStatus, SpecialRequest, SpecialRequestType } from '../../interfaces/thesis-work.interface';
import { Document, DocumentType } from '../../../../core/interfaces/Document.interface';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { DatePipe, LowerCasePipe } from '@angular/common';
import { stateList } from '../../../../core/enums/state.enum';
import { User } from '../../../users/interfaces/user.interface';

@Component({
  selector: 'app-sustentation-details-page',
  templateUrl: './sustentation-details-page.component.html',
  styleUrls: ['./sustentation-details-page.component.css'],
  imports: [ButtonComponent, DatePipe, LowerCasePipe]
})
export class SustentationDetailsPageComponent implements OnInit {
  protected route = inject(ActivatedRoute);
  public router = inject(Router);
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly userService = inject(UserService);
  private readonly notificationService = inject(NotificationService);
  private readonly downloadService = inject(FileDownloadService);

  thesisWorkDetails = signal<ThesisWork | null>(null);
  sustentationId = signal<string | null>(null);
  isArchived = signal<boolean>(false);

  selectedSustentation = computed<SustentationRegistry | null>(() => {
    const work = this.thesisWorkDetails();
    const id = this.sustentationId();
    if (!work || !work.sustentations || !id) return null;
    return work.sustentations.find(s => s.id === id) || null;
  });

  latestVeredict = computed<JurorVerdict | null>(() => {
    const sustentation = this.selectedSustentation();
    if (!sustentation || !sustentation.verdicts) return null;
    return sustentation.verdicts.length > 0
      ? sustentation.verdicts[sustentation.verdicts.length - 1]
      : null;
  });

  showCorrectedDocumentsButton = computed<boolean>(() => {
    const work = this.thesisWorkDetails();
    const sustentation = this.selectedSustentation();

    if (!work || !sustentation) return false;

    const hadObservaciones = sustentation.verdicts?.some(
      v => v.veredict === stateList.APROBADO_CON_OBSERVACIONES
    );
    const hasDeliveries = (work.correctedDeliveries?.length ?? 0) > 0;

    return !!hadObservaciones || hasDeliveries;
  });

  actaDocument = computed<Document | null>(() => {
    const work = this.thesisWorkDetails();
    if (!work || !work.documents) return null;
    return work.documents.find(doc => doc.type === DocumentType.FORMATO_G) || null;
  });

  // ─── Lógica de Estado Administrativo ──────────────────────────────────────────

  administrativeStatus = computed<SustentationStatus | undefined>(() => {
    return this.selectedSustentation()?.status;
  });

  isAdministrativelyPostponed = computed<boolean>(() => {
    return this.administrativeStatus() === SustentationStatus.APLAZADA;
  });

  isAdministrativelyCanceled = computed<boolean>(() => {
    return this.administrativeStatus() === SustentationStatus.CANCELADA;
  });

  postponementReason = computed<SpecialRequest | null>(() => {
    const work = this.thesisWorkDetails();
    if (!work || !this.isAdministrativelyPostponed()) return null;

    const specialRequests = work.specialRequests || [];

    const reprogrammingRequests = specialRequests
      .filter(req => req.requestType === SpecialRequestType.NUEVA_SUSTENTACION && req.status === stateList.APROBADO)
      .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());

    return reprogrammingRequests.length > 0 ? reprogrammingRequests[0] : null;
  });

  approvedSpecialRequests = computed<SpecialRequest[]>(() => {
    const work = this.thesisWorkDetails();
    if (!work || !work.specialRequests) return [];

    // Filtramos solo las aprobadas y las ordenamos por fecha (más recientes primero)
    return work.specialRequests
      .filter(req => req.status === stateList.APROBADO)
      .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
  });

  ngOnInit(): void {
    this.isArchived.set(this.router.url.includes('/history') || this.router.url.includes('/historial') || !!this.route.snapshot.data['isArchived']);

    const sId = this.route.snapshot.paramMap.get('sustentationId');
    this.sustentationId.set(sId);

    // 1. Empezamos desde la ruta actual
    let currentSnapshot: import('@angular/router').ActivatedRouteSnapshot | null = this.route.snapshot;
    let thesisWorkId: string | null = null;

    // 2. Escalamos hacia arriba en el árbol hasta encontrar el parámetro 'id'
    while (currentSnapshot) {
      if (currentSnapshot.paramMap.has('id')) {
        thesisWorkId = currentSnapshot.paramMap.get('id');
        break;
      }
      currentSnapshot = currentSnapshot.parent;
    }

    // 3. Validamos si, después de revisar todo el árbol, sigue sin existir
    if (!thesisWorkId) {
      this.handleNavigationError();
      return;
    }

    // 4. Continuamos con el flujo normal
    this.thesisWorkService.getThesisWorkByIdMock(thesisWorkId).subscribe({
      next: (foundData: ThesisWork | undefined) => {
        if (foundData) {
          this.thesisWorkDetails.set(foundData);
        } else {
          this.showNotFoundNotification();
          this.goBack();
        }
      },
      error: () => {
        this.showErrorNotification();
        this.goBack();
      }
    });
  }

  // ─── Miembros y autores ───────────────────────────────────────────────────────

  getMemberName(userId: string | undefined): string {
    if (!userId) return 'No asignado';
    return this.userService.getUserFullName(userId);
  }

  getAuthors(authors: User[] | undefined): string {
    return this.userService.getAuthorsNames(authors as any) || 'No asignados';
  }

  getAssignedJurors(): string {
    const sustentation = this.selectedSustentation();
    const jurors = sustentation?.assignedJurors || [];
    if (jurors.length === 0) return 'No asignados';
    return jurors
      .map((j: User) => this.userService.getUserFullName(j.id))
      .join(' y ');
  }

  // ─── Documentos ───────────────────────────────────────────────────────────────

  getExistingDocument(type: string): Document | null {
    const targetType = type.toUpperCase().trim();
    const thesis = this.thesisWorkDetails();

    if (targetType === 'MONOGRAFIA' || targetType === 'ANEXOS') {
      if (!thesis?.finalDeliveries?.length) return null;

      const latestDelivery = [...thesis.finalDeliveries].sort((a, b) =>
        new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
      )[0];

      if (targetType === 'MONOGRAFIA') return latestDelivery?.monograph ?? null;
      if (targetType === 'ANEXOS') return latestDelivery?.annexes ?? null;
    }

    if (targetType === 'FORMATO_G') {
      if (!thesis?.pazYSalvos?.length) return null;

      const latestPazYSalvo = [...thesis.pazYSalvos].sort((a, b) =>
        new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime()
      )[0];

      return latestPazYSalvo?.document ?? null;
    }

    return null;
  }

  // ─── Acciones ─────────────────────────────────────────────────────────────────

  navigateToCorrectedDocuments(): void {
    this.router.navigate(['../../corrected_documents'], { relativeTo: this.route });
  }

  downloadDocument(doc?: Document | null): void {
    if (!doc?.url) {
      this.showDownloadError();
      return;
    }
    this.downloadService.download(doc.url, doc.name);
  }

  goBack(): void {
    this.router.navigate(['loaded_documents'], { relativeTo: this.route.parent });
  }

  // ─── Notificaciones ───────────────────────────────────────────────────────────

  private handleNavigationError(): void {
    this.notificationService.show({
      title: 'Error',
      message: 'ID inválido.',
      type: NotificationType.ERROR
    });
    this.goBack();
  }

  private showNotFoundNotification(): void {
    this.notificationService.show({
      title: 'No encontrado',
      message: 'Trabajo no registrado.',
      type: NotificationType.ERROR
    });
  }

  private showErrorNotification(): void {
    this.notificationService.show({
      title: 'Error',
      message: 'Error de comunicación.',
      type: NotificationType.ERROR
    });
  }

  private showDownloadError(): void {
    this.notificationService.show({
      title: 'Error',
      message: 'Acta no encontrada.',
      type: NotificationType.ERROR
    });
  }
}
