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

  // ← Claves del Record ahora usan el enum en vez de repetir los string
  // literals. Sigue tipado Record<string, ...> (no Record<LoadedDocumentsTabType, ...>)
  // a propósito: activeTab más abajo debe seguir siendo signal<string>
  // porque <app-tabs> emite un string genérico en (tabChange) — mismo
  // razonamiento ya documentado en downloadable-formats-page.model.ts
  // para este mismo patrón de tabs en otro módulo.
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
      // Nota: setDynamicTitle ya actualiza internamente el título del
      // navegador desde el refactor de BreadcrumbService de hace varios
      // turnos — la llamada a titleService.setTitle() de abajo quedó
      // redundante (mismo string escrito dos veces), pero no rota. No la
      // toco porque no es parte de este pedido; queda como candidata a
      // limpieza si en algún momento quieres simplificarlo.
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
      isAssignedEvaluator: preliminaryDraft?.evaluators?.some((ev: { id: string }) => ev.id === user?.id) ?? false,
      isConsejoMember: this.authService.hasAnyRole([UserRoleType.CONSEJO]),
      totalEvaluatorsCount: preliminaryDraft?.evaluators?.length || 0,
      // ← FIX: 'Anteproyecto'/'Correccion' → DocumentType.ANTEPROYECTO/
      // DocumentType.CORRECCION. DocumentType.CORRECCION está confirmado
      // (se usa un poco más abajo en modalConfig.uploadDocumentType de
      // AnteproyectosTabConfig). DocumentType.ANTEPROYECTO lo asumo por
      // convención del enum — todo lo demás en el proyecto (AVANCE,
      // FORMATO_E, FORMATO_C, FORMATO_G, PAZ_Y_SALVO) es un valor de
      // este mismo enum, nunca un string suelto. Verifica que el nombre
      // exacto coincida en tu document-type.enum.ts real; si difiere,
      // dime el nombre correcto y lo ajusto.
      latestAnteproyectoId: documents.find(d => d.type === DocumentType.ANTEPROYECTO || d.type === DocumentType.CORRECCION)?.id,
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
        // ← handleDownload ahora es async; void marca explícitamente que
        // no se espera el resultado aquí — ya maneja éxito/error con
        // sus propias notificaciones.
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

  // ← FIX CENTRAL: antes solo pasaba selectedFileData.fileName al
  // mapper — selectedFileData.file (el archivo real) se descartaba sin
  // usarse, y el mapper hardcodeaba url: ''. Mismo bug exacto que en
  // Propuestas: cualquier corrección de anteproyecto subida desde esta
  // página quedaba con una URL vacía, imposible de descargar después.
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

    // ← first() agregado: faltaba en esta suscripción — el único punto
    // de este módulo sin esa protección contra memory leaks.
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

  // ← FIX: antes era "fire and forget" — sin await ni try/catch, mismo
  // problema corregido en LoadedProposalsFacadeService. Se agrega
  // también "Descarga iniciada" para igualar el comportamiento que
  // Propuestas ya tenía.
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

  // ← NUEVO: con la construcción síncrona previa, leer el archivo no
  // podía fallar de esta forma. Ahora que buildNewDocumentRecord es
  // async (FileReader), sí puede fallar (archivo corrupto, permisos) y
  // necesita su propio aviso, distinto del error de red de "Error de carga".
  private showErrorReadingFileNotification(): void {
    this.showNotification('Error al leer el archivo', 'No se pudo procesar el archivo seleccionado. Intente con otro archivo.', NotificationType.ERROR);
  }

  private showRestrictedActionNotification(): void {
    this.showNotification('Acción no permitida', 'No tiene los permisos requeridos o el estado actual del documento no permite esta acción.', NotificationType.ERROR);
  }

  // ← NUEVO: los 6 métodos de arriba antes repetían this.notificationService.show({...})
  // de forma inline cada uno — mismo patrón de helper compartido que usa
  // el resto de facades del proyecto (LoadedProposalsFacadeService,
  // LoadedDocumentsThesisWorkFacadeService, etc.).
  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
