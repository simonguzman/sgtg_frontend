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

export class HistoryPageComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly titleService = inject(Title);
  private readonly authService = inject(AuthService);
  private readonly breadcrumbService = inject(BreadcrumbService);

  private readonly proposalsTab = inject(ArchivedProposalsTabService);
  private readonly preliminaryDraftsTab = inject(ArchivedPreliminaryDraftsTabService);
  private readonly thesisWorksTab = inject(ArchivedThesisWorksTabService);

  protected readonly tabsConfig = HISTORY_TABS_CONFIG;

  private readonly tabStrategies: Record<string, HistoryTabConfiguration> = {
    'PROPUESTAS': this.proposalsTab,
    'ANTEPROYECTOS': this.preliminaryDraftsTab,
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
}
