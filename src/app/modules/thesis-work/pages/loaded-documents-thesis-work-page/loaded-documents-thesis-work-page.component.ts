import { Component, computed, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { TabConfiguration, ThesisEvaluationContext } from './tabs-logic/tab-config.interface';
import { AdvancesTabConfig } from './tabs-logic/advaces.tab';
import { FinalDeliveryTabConfig } from './tabs-logic/final-delivery.tab';
import { PazYSalvoTabConfig } from './tabs-logic/paz_y_salvo.tab';
import { SustentationTabConfig } from './tabs-logic/sustentation.tab';
import { CorrespondenceTabConfig } from './tabs-logic/correspondence.tab';
import { SpecialRequestTabConfig } from './tabs-logic/special-request.tab';
import { UserRoleType } from '../../../../core/enums/user-role-type.enum';
import { TableButton, TableComponent } from '../../../../shared/components/table-component/table-component.component';
import { ThesisWorkService } from '../../services/thesis-work.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { BreadcrumbService } from '../../../../core/services/breadcrumb/breadcrumb.service';
import { UserService } from '../../../users/services/user.service';
import { TabsComponent } from '../../../../shared/components/tabs/tabs.component';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { RegisterInformationModalComponent } from '../../../../shared/components/modals/register-information-modal/register-information-modal.component';
import { Advance } from '../../interfaces/advance.interface';
import { User } from '../../../users/interfaces/user.interface';
import { LoadedDocumentsThesisWorkFacadeService } from './services/loaded-documents-thesis-work-facade.service';
import { ThesisWorkDetailsModalResolverService } from './services/thesis-work-details-modal-resolver.service';
import {
  THESIS_TABS_CONFIG,
  TAB_MODAL_HEADERS,
  TAB_MODAL_SUBTITLES
} from './models/loaded-documents-thesis-work.model';

@Component({
  selector: 'app-loaded-documents-thesis-work-page',
  templateUrl: './loaded-documents-thesis-work-page.component.html',
  styleUrls: ['./loaded-documents-thesis-work-page.component.css'],
  imports: [
    FileUploadModalComponent,
    ConfirmationActionModalComponent,
    TableComponent,
    TabsComponent,
    RegisterInformationModalComponent
  ]
})
export class LoadedDocumentsThesisWorkPageComponent implements OnInit, OnDestroy {
  private readonly route              = inject(ActivatedRoute);
  private readonly router             = inject(Router);
  private readonly thesisWorkService  = inject(ThesisWorkService);
  private readonly authService        = inject(AuthService);
  private readonly breadcrumbService  = inject(BreadcrumbService);
  private readonly titleService       = inject(Title);
  private readonly userService        = inject(UserService);
  protected readonly facade           = inject(LoadedDocumentsThesisWorkFacadeService);
  private readonly modalResolver      = inject(ThesisWorkDetailsModalResolverService);

  // ── Constantes del modelo ─────────────────────────────────────────────────
  protected readonly tabsConfig = THESIS_TABS_CONFIG;

  // ── Estrategias de tab (patrón Strategy) ──────────────────────────────────
  private readonly tabStrategies: Record<string, TabConfiguration> = {
    'AVANCES':         AdvancesTabConfig,
    'ENTREGA FINAL':   FinalDeliveryTabConfig,
    'PAZ Y SALVO':     PazYSalvoTabConfig,
    'SUSTENTACION':    SustentationTabConfig,
    'CORRESPONDENCIA': CorrespondenceTabConfig,
    'SOLICITUDES':     SpecialRequestTabConfig
  };

  // ── Estado de UI (exclusivo del componente) ───────────────────────────────
  readonly activeTab          = signal<string>('AVANCES');
  readonly thesisWorkId       = signal<string | null>(null);
  readonly isUploadModalOpen  = signal(false);
  readonly isConfirmModalOpen = signal(false);
  readonly uploadContext      = signal<{ fileName: string; file: File } | null>(null);
  readonly isDetailsModalOpen = signal(false);
  readonly selectedAdvance    = signal<Advance | null>(null);

  constructor() {
    // Effect: sincroniza el breadcrumb con la pestaña activa.
    // setTimeout evita el error ExpressionChangedAfterItHasBeenChecked
    // en el ciclo de detección de cambios de Angular.
    effect(() => {
      const tabLabel = this.tabsConfig.find(t => t.value === this.activeTab())?.label ?? 'Documentos';
      setTimeout(() => {
        this.breadcrumbService.setDynamicBreadcrumb(tabLabel);
        this.breadcrumbService.setDynamicTitle(`Trabajo de Grado - ${tabLabel}`);
        this.titleService.setTitle(`Trabajo de Grado - ${tabLabel}`);
      });
    });
  }

  ngOnInit(): void {
    // Resolución de ID: recorre el árbol de rutas para encontrar el parámetro :id
    let currentRoute = this.route;
    while (currentRoute.firstChild) currentRoute = currentRoute.firstChild;

    const id = currentRoute.snapshot.paramMap.get('id')
             ?? this.route.snapshot.paramMap.get('id')
             ?? this.route.parent?.snapshot.paramMap.get('id');

    if (id) this.thesisWorkId.set(id);
  }

  ngOnDestroy(): void {
    this.breadcrumbService.clearDynamicBreadcrumb();
    this.breadcrumbService.setDynamicTitle(null);
  }

  // ── Computed: datos del trabajo de grado activo ───────────────────────────
  private readonly currentThesisWork = computed(() => {
    const id = this.thesisWorkId();
    return id ? this.thesisWorkService.allThesisWorks().find(w => w.thesisWorkId === id) : null;
  });

  readonly currentStrategy = computed<TabConfiguration>(() =>
    this.tabStrategies[this.activeTab()] ?? AdvancesTabConfig
  );

  readonly evaluationContext = computed<ThesisEvaluationContext>(() => {
    const thesis    = this.currentThesisWork();
    const user      = this.authService.currentUser();
    const isAdmin   = this.authService.hasAnyRole([UserRoleType.ADMINISTRADOR]);

    const baseContext: ThesisEvaluationContext = {
      thesisWork:             thesis ?? null,
      currentUser:            user,
      isAdmin,
      isDecanatura:           this.authService.hasAnyRole([UserRoleType.DECANATURA]),
      isConsejo:              this.authService.hasAnyRole([UserRoleType.CONSEJO]),
      isStudent:              thesis?.preliminaryDraftData?.proposalData?.authors?.some(
        (author: { id?: string } | string) =>
          (typeof author === 'string' ? author : author.id) === user?.id
      ) ?? false,
      isDirector:   thesis?.preliminaryDraftData?.proposalData?.director?.id   === user?.id,
      isCodirector: thesis?.preliminaryDraftData?.proposalData?.codirector?.id === user?.id,
      isAdvisor:    thesis?.preliminaryDraftData?.proposalData?.advisor?.id     === user?.id,
      isJuror:      thesis?.sustentations?.[0]?.assignedJurors?.some(
        (juror: User) => juror.id === user?.id
      ) ?? false,
      latestAdvanceId:        null,
      isLatestAdvancePending: false,
      isArchived:             thesis?.isArchived ?? false
    };

    return this.currentStrategy().enrichEvaluationContext(baseContext);
  });

  readonly currentColumns      = computed(() => this.currentStrategy().columns);
  readonly currentHeaderButtons = computed(() => this.currentStrategy().getHeaderButtons(this.evaluationContext()));

  readonly currentTableData = computed(() => {
    const context = this.evaluationContext();
    const thesis  = context.thesisWork;
    if (!thesis) return [];
    const docs = this.activeTab() === 'AVANCES' ? [] : (thesis.documents ?? []);
    return this.currentStrategy().getTableData(docs, context);
  });

  readonly selectedAdvanceDocuments = computed<string[]>(() =>
    this.selectedAdvance()?.documents?.map((d: FileDocument) => d.name) ?? []
  );

  // ── Computed: datos de participantes para el modal ────────────────────────
  readonly studentName = computed<string>(() => {
    const authors = this.evaluationContext().thesisWork?.preliminaryDraftData?.proposalData?.authors;
    return this.userService.getAuthorsNames(authors) || 'Sin estudiante';
  });

  readonly directorName = computed<string>(() => {
    const director = this.evaluationContext().thesisWork?.preliminaryDraftData?.proposalData?.director;
    return director ? this.userService.formatFullName(director) : 'Sin director';
  });

  readonly codirectorName = computed<string | undefined>(() => {
    const codirector = this.evaluationContext().thesisWork?.preliminaryDraftData?.proposalData?.codirector;
    return codirector ? this.userService.formatFullName(codirector) : undefined;
  });

  readonly advisorName = computed<string | undefined>(() => {
    const advisor = this.evaluationContext().thesisWork?.preliminaryDraftData?.proposalData?.advisor;
    return advisor ? this.userService.formatFullName(advisor) : undefined;
  });

  readonly modalityName = computed<string>(() =>
    this.evaluationContext().thesisWork?.preliminaryDraftData?.proposalData?.modality ?? 'Sin modalidad'
  );

  // ← Record lookup en vez de if-else largo — más conciso y declarativo
  readonly modalDetailsHeader = computed<string>(() =>
    TAB_MODAL_HEADERS[this.activeTab()] ?? 'Detalles del Registro'
  );

  readonly modalDetailsSubtitle = computed<string>(() =>
    TAB_MODAL_SUBTITLES[this.activeTab()] ?? 'Información del documento cargado'
  );

  // ── Handlers de tabla ─────────────────────────────────────────────────────
  handleHeaderButton(_button: TableButton): void {
    const routePath = this.currentStrategy().headerActionRoute;
    if (routePath) {
      this.router.navigate([routePath], { relativeTo: this.route.parent });
    } else {
      this.isUploadModalOpen.set(true);
    }
  }

  handleTableAction(event: { action: string; row: Record<string, unknown> }): void {
    const rowAllowedActions = event.row['allowedActions'] as string[] | undefined;
    const rowId             = event.row['id'] as string;

    if (rowAllowedActions && !rowAllowedActions.includes(event.action)) {
      this.facade.showRestrictedActionNotification();
      return;
    }

    switch (event.action) {
      case 'download': {
        const url  = typeof event.row['url']  === 'string' ? event.row['url']  : '';
        const name = typeof event.row['name'] === 'string' ? event.row['name'] : 'documento_sin_titulo';
        this.facade.downloadDocument({ url, name } as FileDocument);
        break;
      }
      case 'evaluate-advance':
        this.router.navigate(['evaluate_advance', rowId], { relativeTo: this.route.parent });
        break;
      case 'evaluate_special_request':
        this.router.navigate(['evaluate_special_request', rowId], { relativeTo: this.route.parent });
        break;
      case 'view_sustentation_details':
        // ← console.log eliminados (debug code en producción)
        this.router.navigate([event.action, rowId], { relativeTo: this.route.parent });
        break;
      case 'evaluate_sustentation':
        this.router.navigate([event.action, rowId], { relativeTo: this.route.parent });
        break;
      case 'view-details':
        this.openDetailsModal(rowId);
        break;
      default:
        this.router.navigate([event.action], { relativeTo: this.route.parent });
        break;
    }
  }

  // ── Flujo de carga de archivos ────────────────────────────────────────────
  onFileSelected(event: { fileName: string; file: File }): void {
    this.uploadContext.set(event);
    this.isUploadModalOpen.set(false);
    this.isConfirmModalOpen.set(true);
  }

  confirmUpload(): void {
    const fileData    = this.uploadContext();
    const thesisId    = this.thesisWorkId();
    const docType     = this.currentStrategy().modalConfig.uploadDocumentType;
    if (!fileData || !thesisId || !docType) return;

    // ← Delegado a la fachada que ya incluye first() y notificaciones
    this.facade.uploadDocument(
      thesisId,
      fileData,
      docType,
      () => this.cancelUpload(),
      () => { /* fachada ya notificó el error */ }
    );
  }

  cancelUpload(): void {
    this.isConfirmModalOpen.set(false);
    this.uploadContext.set(null);
  }

  // ── Modal de detalles ─────────────────────────────────────────────────────
  private openDetailsModal(rowId: string): void {
    const thesis = this.currentThesisWork();
    if (!thesis) return;

    // ← 6 branches → 1 llamada al resolver (SRP)
    const resolved = this.modalResolver.resolve(rowId, this.activeTab(), thesis);

    if (!resolved) {
      this.facade.showNotFoundError();
      return;
    }

    this.selectedAdvance.set(resolved);
    this.isDetailsModalOpen.set(true);
  }

  // ── Descarga por nombre (llamada desde el modal de detalles) ──────────────
  downloadDocumentByName(fileName: string): void {
    this.facade.downloadDocumentByName(
      fileName,
      this.activeTab(),
      this.selectedAdvance(),
      this.currentThesisWork()
    );
  }

  // ── Utilidad de fecha para el modal ──────────────────────────────────────
  ensureDate(date: Date | string | undefined | null): Date {
    if (date instanceof Date && !isNaN(date.getTime())) return date;
    if (typeof date === 'string' && date.trim()) {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  }

  // ── Navegación ────────────────────────────────────────────────────────────
  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route.parent });
  }
}
