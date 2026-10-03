import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { first } from 'rxjs/operators';
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
import { LOADED_DOCUMENTS_TABS, LoadedDocumentsTabType, UploadContext } from '../models/loaded-documents-preliminary-draft-page.model';

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
    [LoadedDocumentsTabType.ANTEPROYECTOS]: AnteproyectosTabConfig,
    [LoadedDocumentsTabType.PRESENTACIONES]: PresentacionesTabConfig
  };

  readonly activeTab = signal<string>(LoadedDocumentsTabType.ANTEPROYECTOS);
  readonly preliminaryDraftId = signal<string | null>(null);
  readonly uploadContext = signal<UploadContext | null>(null);
  readonly isUploadModalOpen = signal<boolean>(false);
  readonly isConfirmModalOpen = signal<boolean>(false);

  constructor() {
    effect(() => {
      const tab = this.activeTab();
      const tabLabel = tab === LoadedDocumentsTabType.ANTEPROYECTOS
        ? 'Anteproyectos'
        : 'Presentaciones al consejo de facultad';
      this.breadcrumbService.setDynamicBreadcrumb(tabLabel);
      this.breadcrumbService.setDynamicTitle(`Documentos cargados - ${tabLabel}`);
      this.titleService.setTitle(`Documentos cargados - ${tabLabel}`);
    });
  }

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
      isAssignedEvaluator: preliminaryDraft?.evaluators?.some((evaluation: { id: string }) => evaluation.id === user?.id) ?? false,
      isConsejoMember: this.authService.hasAnyRole([UserRoleType.CONSEJO]),
      totalEvaluatorsCount: preliminaryDraft?.evaluators?.length || 0,
      latestAnteproyectoId: documents.find(document => document.type === DocumentType.ANTEPROYECTO || document.type === DocumentType.CORRECCION)?.id,
      latestPresentacionId: documents.find(document => document.type === DocumentType.FORMATO_C)?.id
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

  init(): void {
    const preliminaryDraftId = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id');
    if (preliminaryDraftId) this.preliminaryDraftId.set(preliminaryDraftId);
  }

  destroy(): void {
    this.breadcrumbService.clearDynamicBreadcrumb();
    this.breadcrumbService.setDynamicTitle(null);
  }

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
        void this.handleDownload(event.row);
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

  async confirmUpload(): Promise<void> {
    const selectedFileData = this.uploadContext();
    const preliminaryDraft = this.currentPreliminaryDraft();
    if (!selectedFileData || !preliminaryDraft?.preliminaryDraftId) return;

    this.showProcessingNotification();

    let newDocumentRecord: FileDocument;
    try {
      newDocumentRecord = await this.mapperService.buildNewDocumentRecord(
        selectedFileData.fileName,
        selectedFileData.file,
        this.currentStrategy().modalConfig.uploadDocumentType
      );
    } catch (err) {
      console.error('Error leyendo el archivo seleccionado:', err);
      this.showErrorReadingFileNotification();
      return;
    }

    this.preliminaryDraftService.uploadDocument(preliminaryDraft.preliminaryDraftId, newDocumentRecord)
      .pipe(first())
      .subscribe({
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

  private async handleDownload(document: FileDocument): Promise<void> {
    if (!document.url?.trim()) {
      this.showNotification('Error de descarga', 'No existe una URL válida para este documento.', NotificationType.ERROR);
      return;
    }

    this.showNotification('Descarga iniciada', 'El documento se está descargando.', NotificationType.INFO);

    try {
      await this.downloadService.download(document.url, `${document.name}.pdf`);
    } catch (err) {
      console.error(`Error al descargar el documento ${document.name}:`, err);
      this.showNotification('Error de descarga', `No se pudo descargar ${document.name}. Intente más tarde.`, NotificationType.ERROR);
    }
  }

  private showProcessingNotification(): void {
    this.showNotification('Subiendo documento', 'Estamos procesando y registrando el archivo en el sistema...', NotificationType.INFO);
  }

  private showSuccessNotification(): void {
    this.showNotification('¡Carga exitosa!', 'El nuevo documento ha sido registrado y está disponible para revisión.', NotificationType.CONFIRMATION);
  }

  private showErrorNotification(): void {
    this.showNotification('Error de carga', 'No se pudo completar la subida del archivo. Por favor, intente de nuevo.', NotificationType.ERROR);
  }

  private showErrorReadingFileNotification(): void {
    this.showNotification('Error al leer el archivo', 'No se pudo procesar el archivo seleccionado. Intente con otro archivo.', NotificationType.ERROR);
  }

  private showRestrictedActionNotification(): void {
    this.showNotification('Acción no permitida', 'No tiene los permisos requeridos o el estado actual del documento no permite esta acción.', NotificationType.ERROR);
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
