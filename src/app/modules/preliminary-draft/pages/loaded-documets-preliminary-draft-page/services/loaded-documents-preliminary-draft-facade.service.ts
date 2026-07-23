import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';

import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { BreadcrumbService } from '../../../../../core/services/breadcrumb/breadcrumb.service';

import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';

import { PreliminaryDraftEvaluationContext, PreliminaryDraftTabConfiguration } from '../tabs-logic/tab-config.interface';
import { AnteproyectosTabConfig } from '../tabs-logic/anteproyectos.tab';
import { PresentacionesTabConfig } from '../tabs-logic/presentaciones.tab';

import { LoadedDocumentsPreliminaryDraftMapperService } from './loaded-documents-preliminary-draft-mapper.service';
import { LOADED_DOCUMENTS_TABS, UploadContext } from '../models/loaded-documents-preliminary-draft-page.model';

@Injectable()
export class LoadedDocumentsPreliminaryDraftFacadeService {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly downloadService = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly titleService = inject(Title);
  private readonly mapperService = inject(LoadedDocumentsPreliminaryDraftMapperService);

  readonly tabs = LOADED_DOCUMENTS_TABS;

  private readonly tabStrategies: Record<string, PreliminaryDraftTabConfiguration> = {
    'ANTEPROYECTOS': AnteproyectosTabConfig,
    'PRESENTACIONES': PresentacionesTabConfig
  };

  // Signals de estado UI
  readonly activeTab = signal<string>('ANTEPROYECTOS');
  readonly preliminaryDraftId = signal<string | null>(null);
  readonly uploadContext = signal<UploadContext | null>(null);
  readonly isUploadModalOpen = signal<boolean>(false);
  readonly isConfirmModalOpen = signal<boolean>(false);

  constructor() {
    // Sincronización dinámica de breadcrumb y título mediante un Effect de Signal
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

  // Computeds
  private readonly currentPreliminaryDraft = computed(() => {
    const id = this.preliminaryDraftId();
    if (!id) return null;
    return this.preliminaryDraftService.allPreliminaryDrafts().find(
      preliminaryDraft => preliminaryDraft.preliminaryDraftId === id
    );
  });

  readonly currentStrategy = computed<PreliminaryDraftTabConfiguration>(() => {
    return this.tabStrategies[this.activeTab()] || AnteproyectosTabConfig;
  });

  readonly evaluationContext = computed<PreliminaryDraftEvaluationContext | null>(() => {
    const preliminaryDraft = this.currentPreliminaryDraft();
    if (!preliminaryDraft) return null;

    const user = this.authService.currentUser();
    const documents = preliminaryDraft.documents || [];

    const baseContext: PreliminaryDraftEvaluationContext = {
      preliminaryDraft: preliminaryDraft,
      currentUser: user,
      isAdmin: this.authService.hasAnyRole([UserRoleType.ADMINISTRADOR]),
      isJefe: this.authService.hasAnyRole([UserRoleType.JEFE_DEP]),
      isDirector: preliminaryDraft?.proposalData?.director?.id === user?.id,
      isAssignedEvaluator: preliminaryDraft?.evaluators?.some((ev: { id: string }) => ev.id === user?.id) ?? false,
      isConsejoMember: this.authService.hasAnyRole([UserRoleType.CONSEJO]),
      totalEvaluatorsCount: preliminaryDraft?.evaluators?.length || 0,
      latestAnteproyectoId: documents.find(d => d.type === 'Anteproyecto' || d.type === 'Correccion')?.id,
      latestPresentacionId: documents.find(d => d.type === DocumentType.FORMATO_C)?.id
    };

    return this.currentStrategy().enrichEvaluationContext(baseContext);
  });

  readonly currentColumns = computed(() => this.currentStrategy().columns);

  readonly currentHeaderButtons = computed(() => {
    const context = this.evaluationContext();
    if (!context) return [];
    return this.currentStrategy().getHeaderButtons(context, this.preliminaryDraftService);
  });

  readonly currentTableData = computed(() => {
    const context = this.evaluationContext();
    if (!context?.preliminaryDraft?.documents) return [];

    return this.currentStrategy().getTableData(
      context.preliminaryDraft.documents,
      context,
      this.preliminaryDraftService
    );
  });

  readonly emptyMessage = computed(() => this.mapperService.getEmptyMessage(this.activeTab()));
  readonly uploadModalDescription = computed(() => this.mapperService.getUploadModalDescription(this.activeTab()));
  readonly uploadModalUserRole = computed(() => this.mapperService.getUploadModalUserRole(this.activeTab()));
  readonly confirmModalDescription = computed(() => this.mapperService.getConfirmModalDescription(this.activeTab()));

  // Métodos de ciclo de vida
  init(): void {
    const preliminaryDraftId = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id');
    if (preliminaryDraftId) this.preliminaryDraftId.set(preliminaryDraftId);
  }

  destroy(): void {
    this.breadcrumbService.clearDynamicBreadcrumb();
    this.breadcrumbService.setDynamicTitle(null);
  }

  // Métodos de acción
  handleHeaderButton(button: TableButton): void {
    if (button.action === 'upload_document') {
      this.isUploadModalOpen.set(true);
    } else if (button.action) {
      this.router.navigate([button.action], { relativeTo: this.route });
    }
  }

  handleTableAction(event: { action: string; row: FileDocument & { allowedActions?: string[] } }): void {
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

  onFileSelected(event: UploadContext): void {
    this.uploadContext.set(event);
    this.isUploadModalOpen.set(false);
    this.isConfirmModalOpen.set(true);
  }

  confirmUpload(): void {
    const selectedFileData = this.uploadContext();
    const preliminaryDraft = this.currentPreliminaryDraft();

    if (!selectedFileData || !preliminaryDraft?.preliminaryDraftId) return;

    this.showProcessingNotification();

    const newDocumentRecord = this.mapperService.buildNewDocumentRecord(
      selectedFileData.fileName,
      this.currentStrategy().modalConfig.uploadDocumentType
    );

    this.preliminaryDraftService.uploadDocument(preliminaryDraft.preliminaryDraftId, newDocumentRecord).subscribe({
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

  // Métodos de apoyo
  private handleDownload(document: FileDocument): void {
    if (!document.url) {
      this.notificationService.show({
        title: 'Error de descarga',
        message: 'No existe una URL válida para este documento.',
        type: NotificationType.ERROR
      });
      return;
    }
    this.downloadService.download(document.url, `${document.name}.pdf`);
  }

  private showProcessingNotification(): void {
    this.notificationService.show({
      title: 'Subiendo documento',
      message: 'Estamos procesando y registrando el archivo en el sistema...',
      type: NotificationType.INFO
    });
  }

  private showSuccessNotification(): void {
    this.notificationService.show({
      title: '¡Carga exitosa!',
      message: 'El nuevo documento ha sido registrado y está disponible para revisión.',
      type: NotificationType.CONFIRMATION
    });
  }

  private showErrorNotification(): void {
    this.notificationService.show({
      title: 'Error de carga',
      message: 'No se pudo completar la subida del archivo. Por favor, intente de nuevo.',
      type: NotificationType.ERROR
    });
  }

  private showRestrictedActionNotification(): void {
    this.notificationService.show({
      title: 'Acción no permitida',
      message: 'No tiene los permisos requeridos o el estado actual del documento no permite esta acción.',
      type: NotificationType.ERROR
    });
  }
}
