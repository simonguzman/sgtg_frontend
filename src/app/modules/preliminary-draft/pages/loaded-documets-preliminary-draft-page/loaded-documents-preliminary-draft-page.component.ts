import { Component, computed, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';

import { PreliminaryDraftService } from '../../services/preliminary-draft.service';
import { FileDownloadService } from '../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { BreadcrumbService } from '../../../../core/services/breadcrumb/breadcrumb.service';

import { TabItem, TabsComponent } from '../../../../shared/components/tabs/tabs.component';
import { TableButton, TableComponent } from '../../../../shared/components/table-component/table-component.component';
import { FileUploadModalComponent } from "../../../../shared/components/modals/file-upload-modal/file-upload-modal.component";
import { ConfirmationActionModalComponent } from "../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component";

import { Document, DocumentType } from '../../../../core/interfaces/Document.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { UserRoleType } from '../../../../core/models/user-role';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';

import { PreliminaryDraftEvaluationContext, PreliminaryDraftTabConfiguration } from './tabs-logic/tab-config.interface';
import { AnteproyectosTabConfig } from './tabs-logic/anteproyectos.tab';
import { PresentacionesTabConfig } from './tabs-logic/presentaciones.tab';

@Component({
  selector: 'app-loaded-documets-preliminary-draft-page',
  templateUrl: './loaded-documents-preliminary-draft-page.component.html',
  styleUrls: ['./loaded-documents-preliminary-draft-page.component.css'],
  imports: [FileUploadModalComponent, ConfirmationActionModalComponent, TableComponent, TabsComponent]
})
export class LoadedDocumentsPreliminaryDraftPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly downloadService = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly titleService = inject(Title);

  readonly tabs: TabItem[] = [
    { label: 'Anteproyectos', value: 'ANTEPROYECTOS' },
    { label: 'Presentaciones al consejo de facultad', value: 'PRESENTACIONES' }
  ];

  private readonly tabStrategies: Record<string, PreliminaryDraftTabConfiguration> = {
    'ANTEPROYECTOS': AnteproyectosTabConfig,
    'PRESENTACIONES': PresentacionesTabConfig
  };

  activeTab = signal<string>('ANTEPROYECTOS');
  preliminaryDraftId = signal<string | null>(null);

  uploadContext = signal<{ fileName: string, file: File } | null>(null);
  isUploadModalOpen = signal(false);
  isConfirmModalOpen = signal(false);

  constructor() {
    effect(() => {
      const tab = this.activeTab();
      const tabLabel = tab === 'ANTEPROYECTOS'
        ? 'Anteproyectos'
        : 'Presentaciones al consejo de facultad';
      this.breadcrumbService.setDynamicBreadcrumb(tabLabel);
      this.breadcrumbService.setDynamicTitle(`Documentos cargados - ${tabLabel}`);
      this.titleService.setTitle(`Documentos cargados - ${tabLabel}`);
    });
  }

  ngOnInit(): void {
    const preliminaryDraftId = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id');
    if (preliminaryDraftId) this.preliminaryDraftId.set(preliminaryDraftId);
  }

  ngOnDestroy(): void {
    this.breadcrumbService.clearDynamicBreadcrumb();
    this.breadcrumbService.setDynamicTitle(null);
  }

  private readonly currentPreliminaryDraft = computed(() => {
    const id = this.preliminaryDraftId();
    if (!id) return null;
    return this.preliminaryDraftService.preliminaryDrafts().find(draft => draft.preliminaryDraftId === id);
  });

  currentStrategy = computed<PreliminaryDraftTabConfiguration>(() => {
    return this.tabStrategies[this.activeTab()] || AnteproyectosTabConfig;
  });

  evaluationContext = computed<PreliminaryDraftEvaluationContext | null>(() => {
    const draft = this.currentPreliminaryDraft();
    if (!draft) return null;

    const user = this.authService.currentUser();
    const documents = draft.documents || [];

    const baseContext: PreliminaryDraftEvaluationContext = {
      preliminaryDraft: draft,
      currentUser: user,
      isAdmin: this.authService.hasAnyRole([UserRoleType.ADMINISTRADOR]),
      isJefe: this.authService.hasAnyRole([UserRoleType.JEFE_DEP]),
      isDirector: draft?.proposalData?.director?.id === user?.id,
      isAssignedEvaluator: draft?.evaluators?.some((ev: any) => ev.id === user?.id) ?? false,
      isConsejoMember: this.authService.hasAnyRole([UserRoleType.CONSEJO]),
      totalEvaluatorsCount: draft?.evaluators?.length || 0,
      latestAnteproyectoId: documents.find(d => d.type === 'Anteproyecto' || d.type === 'Correccion')?.id,
      latestPresentacionId: documents.find(d => d.type === DocumentType.FORMATO_C)?.id
    };

    return this.currentStrategy().enrichEvaluationContext(baseContext);
  });

  currentColumns = computed(() => this.currentStrategy().columns);

  currentHeaderButtons = computed(() => {
    const context = this.evaluationContext();
    if (!context) return [];
    return this.currentStrategy().getHeaderButtons(context, this.preliminaryDraftService);
  });

  currentTableData = computed(() => {
    const context = this.evaluationContext();
    if (!context?.preliminaryDraft?.documents) return [];

    return this.currentStrategy().getTableData(
      context.preliminaryDraft.documents,
      context,
      this.preliminaryDraftService
    );
  });

  handleHeaderButton(button: TableButton): void {
    if (button.action === 'upload_document') {
      this.isUploadModalOpen.set(true);
    } else if (button.action) {
      this.router.navigate([button.action], { relativeTo: this.route });
    }
  }

  handleTableAction(event: { action: string; row: any }): void {
    if (event.row.allowedActions && !event.row.allowedActions.includes(event.action)) {
      this.showRestrictedActionNotification();
      return;
    }

    switch (event.action) {
      case 'download':
        this.handleDownload(event.row);
        break;
      case 'evaluate':
        this.router.navigate(['review_preliminary_draft'], { relativeTo: this.route });
        break;
      case 'evaluate-presentation':
        this.router.navigate(['evaluate_presentation'], { relativeTo: this.route });
        break;
    }
  }

  onFileSelected(event: { fileName: string; file: File }): void {
    this.uploadContext.set(event);
    this.isUploadModalOpen.set(false);
    this.isConfirmModalOpen.set(true);
  }

  confirmUpload(): void {
    const selectedFileData = this.uploadContext();
    const preliminaryDraft = this.currentPreliminaryDraft();

    if (!selectedFileData || !preliminaryDraft?.preliminaryDraftId) return;

    this.showProcessingNotification();

    const newDocumentRecord: Document = {
      id: crypto.randomUUID(),
      name: selectedFileData.fileName.replace('.pdf', ''),
      url: '',
      uploadDate: this.formatDate(new Date()),
      type: this.currentStrategy().modalConfig.uploadDocumentType,
      status: stateList.EN_REVISION
    };

    this.preliminaryDraftService.uploadDocumentMock(preliminaryDraft.preliminaryDraftId, newDocumentRecord).subscribe({
      next: () => {
        this.showSuccessNotification();
        this.cancelUpload();
      },
      error: (err) => {
        console.error('Error en carga:', err);
        this.showErrorNotification();
      }
    });
  }

  cancelUpload(): void {
    this.isConfirmModalOpen.set(false);
    this.uploadContext.set(null);
  }

  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replaceAll('/', ' - ');
  }

  private handleDownload(doc: Document): void {
    if (!doc.url) {
      this.notificationService.show({
        title: 'Error de descarga',
        message: 'No existe una URL válida para este documento.',
        type: NotificationType.ERROR
      });
      return;
    }
    this.downloadService.download(doc.url, `${doc.name}.pdf`);
  }

  private showProcessingNotification() {
    this.notificationService.show({
      title: 'Subiendo documento',
      message: 'Estamos procesando y registrando el archivo en el sistema...',
      type: NotificationType.INFO
    });
  }

  private showSuccessNotification() {
    this.notificationService.show({
      title: '¡Carga exitosa!',
      message: 'El nuevo documento ha sido registrado y está disponible para revisión.',
      type: NotificationType.CONFIRMATION
    });
  }

  private showErrorNotification() {
    this.notificationService.show({
      title: 'Error de carga',
      message: 'No se pudo completar la subida del archivo. Por favor, intente de nuevo.',
      type: NotificationType.ERROR
    });
  }

  private showRestrictedActionNotification() {
    this.notificationService.show({
      title: 'Acción no permitida',
      message: 'No tiene los permisos requeridos o el estado actual del documento no permite esta acción.',
      type: NotificationType.ERROR
    });
  }
}
