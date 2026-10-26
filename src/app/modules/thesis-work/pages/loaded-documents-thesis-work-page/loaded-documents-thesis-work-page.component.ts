import { Component, computed, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { TabConfiguration, ThesisEvaluationContext } from './tabs-logic/tab-config.interface';
import { AdvancesTabConfig } from './tabs-logic/advances.tab';
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
import { ThesisParticipantsFormatterService } from '../../services/thesis-participants-formatter.service';
import { TabsComponent } from '../../../../shared/components/tabs/tabs.component';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { RegisterInformationModalComponent } from '../../../../shared/components/modals/register-information-modal/register-information-modal.component';
import { Advance } from '../../interfaces/advance.interface';
import { User } from '../../../users/interfaces/user.interface';
import { LoadedDocumentsThesisWorkFacadeService } from './services/loaded-documents-thesis-work-facade.service';
import { ThesisWorkDetailsModalResolverService } from './services/thesis-work-details-modal-resolver.service';
import { ensureDate } from '../../helpers/thesis-date.helper';
import {
  THESIS_TABS_CONFIG,
  TAB_MODAL_HEADERS,
  TAB_MODAL_SUBTITLES
} from './models/loaded-documents-thesis-work.model';
import { NavigationHistoryService } from '../../../../core/services/navigation/navigation-history.service';

@Component({
  selector: 'app-loaded-documents-thesis-work-page',
  templateUrl: './loaded-documents-thesis-work-page.component.html',
  styleUrls: ['./loaded-documents-thesis-work-page.component.css'],
  imports: [
    TableComponent,
    TabsComponent,
    RegisterInformationModalComponent
  ]
})
export class LoadedDocumentsThesisWorkPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly navigation = inject(NavigationHistoryService);
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly authService = inject(AuthService);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly titleService = inject(Title);
  private readonly participants = inject(ThesisParticipantsFormatterService);
  protected readonly facade = inject(LoadedDocumentsThesisWorkFacadeService);
  private readonly modalResolver = inject(ThesisWorkDetailsModalResolverService);

  protected readonly tabsConfig = THESIS_TABS_CONFIG;

  private readonly tabStrategies: Record<string, TabConfiguration<any>> = {
    'AVANCES':         AdvancesTabConfig,
    'ENTREGA FINAL':   FinalDeliveryTabConfig,
    'PAZ Y SALVO':     PazYSalvoTabConfig,
    'SUSTENTACION':    SustentationTabConfig,
    'CORRESPONDENCIA': CorrespondenceTabConfig,
    'SOLICITUDES':     SpecialRequestTabConfig
  };

  readonly activeTab = signal<string>('AVANCES');
  readonly thesisWorkId = signal<string | null>(null);
  readonly isDetailsModalOpen = signal(false);
  readonly selectedAdvance = signal<Advance | null>(null);

  constructor() {
    effect(() => {
      const tabLabel = this.tabsConfig.find(tab => tab.value === this.activeTab())?.label ?? 'Documentos';
      setTimeout(() => {
        this.breadcrumbService.setDynamicBreadcrumb(tabLabel);
        this.breadcrumbService.setDynamicTitle(`Trabajo de Grado - ${tabLabel}`);
        this.titleService.setTitle(`Trabajo de Grado - ${tabLabel}`);
      });
    });
  }

  ngOnInit(): void {
    let currentRoute = this.route;
    while (currentRoute.firstChild) currentRoute = currentRoute.firstChild;

    const id = currentRoute.snapshot.paramMap.get('id')
             ?? this.route.snapshot.paramMap.get('id')
             ?? this.route.parent?.snapshot.paramMap.get('id');

    if (id) this.thesisWorkId.set(id);

    // Pestaña indicada en la URL (ej. ?tab=ENTREGA_FINAL desde una notificación)
    const tab = this.route.snapshot.queryParamMap?.get('tab')?.replaceAll('_', ' ');
    if (tab && this.tabsConfig.some(item => item.value === tab)) this.activeTab.set(tab);
  }

  /** Cambia de pestaña y la deja en la URL, para que al regresar a esta página se abra la misma */
  changeTab(tab: string): void {
    this.activeTab.set(tab);
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab: tab.replaceAll(' ', '_') }, replaceUrl: true });
  }

  ngOnDestroy(): void {
    this.breadcrumbService.clearDynamicBreadcrumb();
    this.breadcrumbService.setDynamicTitle(null);
  }

  private readonly currentThesisWork = computed(() => {
    const id = this.thesisWorkId();
    return id ? this.thesisWorkService.allThesisWorks().find(thesisWork => thesisWork.thesisWorkId === id) : null;
  });

  readonly currentStrategy = computed<TabConfiguration<any>>(() =>
    this.tabStrategies[this.activeTab()] ?? AdvancesTabConfig
  );

  readonly evaluationContext = computed<ThesisEvaluationContext>(() => {
    const thesis  = this.currentThesisWork();
    const user = this.authService.currentUser();
    const isAdmin = this.authService.hasAnyRole([UserRoleType.ADMINISTRADOR]);

    const baseContext: ThesisEvaluationContext = {
      thesisWork: thesis ?? null,
      currentUser: user,
      isAdmin,
      isDecanatura: this.authService.hasAnyRole([UserRoleType.DECANATURA]),
      isConsejo: this.authService.hasAnyRole([UserRoleType.CONSEJO]),
      isStudent: thesis?.preliminaryDraftData?.proposalData?.authors?.some(
        (author: { id?: string } | string) =>
          (typeof author === 'string' ? author : author.id) === user?.id
      ) ?? false,
      isDirector: thesis?.preliminaryDraftData?.proposalData?.director?.id   === user?.id,
      isCodirector: thesis?.preliminaryDraftData?.proposalData?.codirector?.id === user?.id,
      isAdvisor: thesis?.preliminaryDraftData?.proposalData?.advisor?.id     === user?.id,
      isJuror: thesis?.sustentation?.jurorIds.includes(user?.id ?? '') ?? false,
      isCoordinator: !!user && thesis?.sustentation?.coordinatorId === user.id,
      latestAdvanceId: null,
      isLatestAdvancePending: false,
      isArchived: thesis?.isArchived ?? false
    };

    return this.currentStrategy().enrichEvaluationContext(baseContext);
  });

  readonly currentColumns = computed(() => this.currentStrategy().columns);
  readonly currentHeaderButtons = computed<TableButton[]>(() =>
    this.currentStrategy().getHeaderButtons(this.evaluationContext()));

  readonly currentTableData = computed(() => {
    const context = this.evaluationContext();
    const thesis = context.thesisWork;
    if (!thesis) return [];
    const docs = this.activeTab() === 'AVANCES' ? [] : (thesis.documents ?? []);
    return this.currentStrategy().getTableData(docs, context) as Record<string, unknown>[];
  });

  readonly selectedAdvanceDocuments = computed<string[]>(() =>
    this.selectedAdvance()?.documents?.map((d: FileDocument) => d.name) ?? []
  );

  readonly studentName = computed<string>(() =>
    this.participants.getStudentNames(this.evaluationContext().thesisWork)
  );

  readonly directorName = computed<string>(() =>
    this.participants.getDirectorName(this.evaluationContext().thesisWork)
  );

  readonly codirectorName = computed<string | undefined>(() =>
    this.participants.getCodirectorName(this.evaluationContext().thesisWork) || undefined
  );

  readonly advisorName = computed<string | undefined>(() =>
    this.participants.getAdvisorName(this.evaluationContext().thesisWork) || undefined
  );

  readonly modalityName = computed<string>(() =>
    this.evaluationContext().thesisWork?.preliminaryDraftData?.proposalData?.modality ?? 'Sin modalidad'
  );

  readonly modalDetailsHeader = computed<string>(() =>
    TAB_MODAL_HEADERS[this.activeTab()] ?? 'Detalles del Registro'
  );

  readonly modalDetailsSubtitle = computed<string>(() =>
    TAB_MODAL_SUBTITLES[this.activeTab()] ?? 'Información del documento cargado'
  );

  handleHeaderButton(_button: TableButton): void {
    const routePath = this.currentStrategy().headerActionRoute;
    if (routePath) this.router.navigate([routePath], { relativeTo: this.route.parent });
  }

  handleTableAction(event: { action: string; row: Record<string, unknown> }): void {
    const rowAllowedActions = event.row['allowedActions'] as string[] | undefined;
    const rowId = event.row['id'] as string;

    if (rowAllowedActions && !rowAllowedActions.includes(event.action)) {
      this.facade.showRestrictedActionNotification();
      return;
    }

    switch (event.action) {
      case 'download': {
        const url  = typeof event.row['url']  === 'string' ? event.row['url']  : '';
        const name = typeof event.row['name'] === 'string' ? event.row['name'] : 'documento_sin_titulo';
        void this.facade.downloadDocument({ url, name } as FileDocument);
        break;
      }
      case 'evaluate-advance':
        this.router.navigate(['evaluate_advance', rowId], { relativeTo: this.route.parent });
        break;
      case 'evaluate_special_request':
        this.router.navigate(['evaluate_special_request', rowId], { relativeTo: this.route.parent });
        break;
      case 'view_sustentation_details':
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

  private openDetailsModal(rowId: string): void {
    const thesis = this.currentThesisWork();
    if (!thesis) return;

    const resolved = this.modalResolver.resolve(rowId, this.activeTab(), thesis);

    if (!resolved) {
      this.facade.showNotFoundError();
      return;
    }

    this.selectedAdvance.set(resolved);
    this.isDetailsModalOpen.set(true);
  }

  downloadDocumentByName(fileName: string): void {
    void this.facade.downloadDocumentByName(fileName, this.selectedAdvance());
  }

  ensureDate = ensureDate;

  goBack(): void {
    this.navigation.back(() => this.router.navigate(['../'], { relativeTo: this.route }));
  }
}
