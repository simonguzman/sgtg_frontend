import { Component, computed, effect, inject, OnDestroy, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { TabsComponent } from '../../../../shared/components/tabs/tabs.component';
import { TableComponent } from '../../../../shared/components/table-component/table-component.component';
import { BreadcrumbService } from '../../../../core/services/breadcrumb/breadcrumb.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { UserRoleType } from '../../../../core/enums/user-role-type.enum';
import { DescriptionModalComponent } from '../../../../shared/components/modals/description-modal/description-modal.component';
import { HistoryTabConfiguration } from '../../interfaces/history-tab-config.interface';
import { HistoryEvaluationContext } from '../../interfaces/history-evaluation-context.interface';
import { ArchivedProposalsTabService } from './services/archived-proposals-tab.service';
import { ArchivedPreliminaryDraftsTabService } from './services/archived-preliminary-drafts-tab.service';
import { ArchivedThesisWorksTabService } from './services/archived-thesis-works-tab.service';
import { HISTORY_TABS_CONFIG, HISTORY_DETAIL_ROUTES } from './models/history-page.model';

@Component({
  selector: 'app-history-page',
  templateUrl: './history-page.component.html',
  styleUrls: ['./history-page.component.css'],
  imports: [TabsComponent, TableComponent, DescriptionModalComponent]
})
// ← OnInit eliminado: ngOnInit(): void {} estaba vacío — implementar la
// interfaz solo para un método sin cuerpo es ruido puro.
export class HistoryPageComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly titleService = inject(Title);
  private readonly authService = inject(AuthService);
  private readonly breadcrumbService = inject(BreadcrumbService);

  // ← Las 3 estrategias ahora son servicios inyectables en vez de
  // constantes planas — ProposalService/UserService ya no se inyectan
  // aquí solo para reenviarlos por el context; cada servicio de tab
  // resuelve sus propias dependencias.
  private readonly proposalsTab = inject(ArchivedProposalsTabService);
  private readonly draftsTab = inject(ArchivedPreliminaryDraftsTabService);
  private readonly thesisWorksTab = inject(ArchivedThesisWorksTabService);

  protected readonly tabsConfig = HISTORY_TABS_CONFIG;

  private readonly tabStrategies: Record<string, HistoryTabConfiguration> = {
    'PROPUESTAS': this.proposalsTab,
    'ANTEPROYECTOS': this.draftsTab,
    'TRABAJOS': this.thesisWorksTab
  };

  readonly activeTab = signal<string>('PROPUESTAS');
  readonly descriptionModal = signal({ show: false, title: '', content: '' });

  constructor() {
    effect(() => {
      const tabLabel = this.tabsConfig.find(t => t.value === this.activeTab())?.label ?? 'Historial';
      setTimeout(() => {
        this.breadcrumbService.setDynamicBreadcrumb(tabLabel);
        this.breadcrumbService.setDynamicTitle(`Historial - ${tabLabel}`);
        this.titleService.setTitle(`Historial - ${tabLabel}`);
      });
    });
  }

  ngOnDestroy(): void {
    this.breadcrumbService.clearDynamicBreadcrumb();
    this.breadcrumbService.setDynamicTitle(null);
  }

  readonly evaluationContext = computed<HistoryEvaluationContext>(() => {
    const user = this.authService.currentUser();
    const hasGlobalAccess = this.authService.hasAnyRole([
      UserRoleType.ADMINISTRADOR,
      UserRoleType.COMITE,
      UserRoleType.CONSEJO,
      UserRoleType.JEFE_DEP
    ]);
    return { currentUser: user, hasGlobalAccess };
  });

  readonly currentStrategy = computed<HistoryTabConfiguration>(() =>
    this.tabStrategies[this.activeTab()] ?? this.proposalsTab
  );

  readonly currentColumns = computed(() => this.currentStrategy().columns);

  readonly currentTableData = computed(() =>
    this.currentStrategy().getTableData(this.evaluationContext())
  );

  handleTableAction(event: { action: string; row: Record<string, unknown> }): void {
    const rowId = event.row['id'] as string;

    switch (event.action) {
      case 'ver descripcion':
        this.descriptionModal.set({
          show: true,
          title: 'Descripción del registro archivado',
          content: (event.row['description'] as string) || 'No hay descripción disponible para este registro.'
        });
        break;
      case 'view-details':
      case 'ver': {
        // ← Antes: 3 if/else if comparando activeTab() como string.
        const routeSegment = HISTORY_DETAIL_ROUTES[this.activeTab()];
        if (routeSegment) {
          this.router.navigate([routeSegment, rowId], { relativeTo: this.route });
        }
        break;
      }
      default:
        console.warn(`Acción no manejada en historial: ${event.action}`);
        break;
    }
  }

  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }
}
