import { Component, computed, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';

import { ThesisWorkService } from '../../services/thesis-work.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { BreadcrumbService } from '../../../../core/services/breadcrumb/breadcrumb.service';
import { FileDownloadService } from '../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { UserFormatterService } from '../../../users/services/user-formatter.service'; // Asegura que la ruta coincida con tu estructura

import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';

import { Column, TableComponent } from "../../../../shared/components/table-component/table-component.component";
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { RegisterInformationModalComponent } from '../../../../shared/components/modals/register-information-modal/register-information-modal.component';
import { InfoBannerComponent } from "../../../../shared/components/info-banner/info-banner.component";

@Component({
  selector: 'app-corrected-documents-page',
  templateUrl: './corrected-documents-page.component.html',
  styleUrls: ['./corrected-documents-page.component.css'],
  standalone: true,
  imports: [TableComponent, ButtonComponent, RegisterInformationModalComponent, InfoBannerComponent]
})
export class CorrectedDocumentsPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly authService = inject(AuthService);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly titleService = inject(Title);
  private readonly downloadService = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);
  private readonly userFormatterService = inject(UserFormatterService);

  thesisWorkId = signal<string | null>(null);
  isDetailsModalOpen = signal<boolean>(false);
  selectedDelivery = signal<any | null>(null);
  isArchived = signal<boolean>(false);

  protected columns: Column[] = [
    { field: 'name', header: 'Nombre de la Entrega', type: 'text', width: '40%' },
    { field: 'date', header: 'Fecha de Carga', type: 'text', width: '20%' },
    { field: 'status', header: 'Estado', type: 'state', width: '20%' },
    {
      field: 'acciones',
      header: 'Acciones',
      type: 'actions',
      width: '20%',
      actions: [
        { action: 'view-details', label: 'Ver Detalles', icon: 'visibility', variant: 'primary', disabled: false }
      ]
    }
  ];

  ngOnInit(): void {
    this.isArchived.set(this.router.url.includes('/history') || this.router.url.includes('/historial') || !!this.route.snapshot.data['isArchived']);
    const id = this.route.snapshot.paramMap.get('id') ||
               this.route.parent?.snapshot.paramMap.get('id') ||
               this.route.parent?.parent?.snapshot.paramMap.get('id');

    if (id) {
      this.thesisWorkId.set(id);
    } else {
      this.notificationService.show({
        title: 'Error de navegación',
        message: 'No se pudo identificar el código del trabajo de grado actual.',
        type: NotificationType.ERROR
      });
      this.goBack();
    }
  }

  ngOnDestroy(): void {
    this.breadcrumbService.clearDynamicBreadcrumb();
    this.breadcrumbService.setDynamicTitle(null);
  }

  // ─── Selectores reactivos ─────────────────────────────────────────────────────

  protected readonly currentThesisWork = computed(() => {
    const id = this.thesisWorkId();
    return id ? this.thesisWorkService.thesisWorks().find(w => w.thesisWorkId === id) : null;
  });

  isDirector = computed(() => {
    const thesis = this.currentThesisWork();
    const user = this.authService.currentUser();
    if (!thesis || !user) return false;
    return thesis.preliminaryDraftData?.proposalData?.director?.id === user.id;
  });

  isJuror = computed(() => {
    const thesis = this.currentThesisWork();
    const user = this.authService.currentUser();
    if (!thesis || !user || !thesis.sustentations?.[0]) return false;
    return thesis.sustentations[0].assignedJurors?.some(juror => juror.id === user.id) ?? false;
  });

  hasUploadedCorrections = computed(() => {
    return (this.currentThesisWork()?.correctedDeliveries?.length ?? 0) > 0;
  });

  canDirectorUpload = computed(() => {
    if (this.isArchived()) return false;
    if (!this.isDirector()) return false;

    const deliveries = this.currentThesisWork()?.correctedDeliveries || [];
    if (deliveries.length === 0) return true;

    const latestStatus = deliveries[0].status || deliveries[0].monograph?.status;
    return latestStatus === stateList.NO_APROBADO || latestStatus === stateList.APLAZADO;
  });

  canJurorEvaluate = computed(() => {
    if (this.isArchived()) return false;
    if (!this.isJuror()) return false;

    const deliveries = this.currentThesisWork()?.correctedDeliveries || [];
    if (deliveries.length === 0) return true;

    const latestStatus = deliveries[0].status || deliveries[0].monograph?.status;
    return latestStatus === stateList.EN_REVISION;
  });

  tableData = computed(() => {
    const thesis = this.currentThesisWork();
    if (!thesis || !thesis.correctedDeliveries) return [];

    return thesis.correctedDeliveries.map((delivery, index) => ({
      id: delivery.id,
      name: `Paquete de Correcciones Radicado ${index + 1}`,
      date: delivery.uploadDate || 'Sin fecha',
      status: delivery.monograph?.status || stateList.EN_REVISION,
      allowedActions: ['view-details'],
      rawDelivery: delivery
    }));
  });

  // ─── Procesadores para el modal de detalles (Formateo Correcto) ───────────────

  selectedDeliveryDocuments = computed<string[]>(() => {
    const delivery = this.selectedDelivery();
    if (!delivery) return [];
    const docs: string[] = [];
    if (delivery.monograph?.name) docs.push(delivery.monograph.name);
    if (delivery.annexes?.name) docs.push(delivery.annexes.name);
    return docs;
  });

  studentName = computed<string>(() => {
    const authors = this.currentThesisWork()?.preliminaryDraftData?.proposalData?.authors;
    return this.userFormatterService.getAuthorsNames(authors) || 'Sin estudiante';
  });

  directorName = computed<string>(() => {
    const director = this.currentThesisWork()?.preliminaryDraftData?.proposalData?.director;
    return director ? this.userFormatterService.formatFullName(director) : 'Sin director';
  });

  codirectorName = computed<string | undefined>(() => {
    const codirector = this.currentThesisWork()?.preliminaryDraftData?.proposalData?.codirector;
    return codirector ? this.userFormatterService.formatFullName(codirector) : undefined;
  });

  advisorName = computed<string | undefined>(() => {
    const advisor = this.currentThesisWork()?.preliminaryDraftData?.proposalData?.advisor;
    return advisor ? this.userFormatterService.formatFullName(advisor) : undefined;
  });

  modalityName = computed<string>(() => {
    return this.currentThesisWork()?.preliminaryDraftData?.proposalData?.modality || 'Sin modalidad';
  });

  ensureDate(date: Date | string | undefined | null): Date {
    if (date instanceof Date && !isNaN(date.getTime())) return date;
    if (typeof date === 'string' && date.trim() !== '') {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  }

  // ─── Acciones ─────────────────────────────────────────────────────────────────

  handleTableAction(event: { action: string; row: any }): void {
    if (event.action === 'view-details') {
      this.selectedDelivery.set(event.row.rawDelivery);
      this.isDetailsModalOpen.set(true);
    }
  }

  downloadDocumentByName(fileName: string): void {
    const delivery = this.selectedDelivery();
    if (!delivery) return;

    let targetDocument: FileDocument | undefined;
    if (delivery.monograph?.name === fileName) targetDocument = delivery.monograph;
    else if (delivery.annexes?.name === fileName) targetDocument = delivery.annexes;

    if (targetDocument) this.downloadDocument(targetDocument);
  }

  private downloadDocument(doc: FileDocument): void {
    if (!doc.url) {
      this.notificationService.show({
        title: 'Error de descarga',
        message: 'No existe un enlace de descarga válido para este archivo.',
        type: NotificationType.ERROR
      });
      return;
    }
    this.downloadService.download(doc.url, `${doc.name}.pdf`);
  }

  // ─── Navegación ───────────────────────────────────────────────────────────────

  navigateToUploadCorrections(): void {
    this.router.navigate(['upload_corrections'], { relativeTo: this.route });
  }

  navigateToEvaluateCorrections(): void {
    this.router.navigate(['evaluate_corrections'], { relativeTo: this.route });
  }

  goBack(): void {
    const id = this.thesisWorkId();
    const thesis = this.currentThesisWork();
    const sustentationId = thesis?.sustentations?.[0]?.id;

    const currentUrl = this.router.url;
    const baseUrlSegment = currentUrl.split('/details')[0] || '/thesis-work';

    if (id) {
      if (sustentationId) {
        this.router.navigate([baseUrlSegment, 'details', id, 'view_sustentation_details', sustentationId]);
      } else {
        this.router.navigate([baseUrlSegment, 'details', id, 'loaded_documents']);
      }
    } else {
      this.router.navigate([baseUrlSegment]);
    }
  }
}
