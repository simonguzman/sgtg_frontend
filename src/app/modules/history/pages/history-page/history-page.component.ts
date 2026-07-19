import { Component, computed, effect, inject, Injector, OnDestroy, OnInit, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { TabItem, TabsComponent } from '../../../../shared/components/tabs/tabs.component';
import { TableComponent } from '../../../../shared/components/table-component/table-component.component';
import { BreadcrumbService } from '../../../../core/services/breadcrumb/breadcrumb.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { UserRoleType } from '../../../../core/enums/user-role-type.enum';
import { DescriptionModalComponent } from '../../../../shared/components/modals/description-modal/description-modal.component';

// Interfaces de Estrategia
import { HistoryTabConfiguration } from '../../interfaces/history-tab-config.interface';
import { HistoryEvaluationContext } from '../../interfaces/history-evaluation-context.interface';
import { ArchivedProposalsTabConfig } from '../archived-process/tabs-logic/archived-proposal.tab';
import { ArchivedPreliminaryDraftsTabConfig } from '../archived-process/tabs-logic/archived-preliminaryDraft.tab';
import { ArchivedThesisWorksTabConfig } from '../archived-process/tabs-logic/archived-thesisWorks.tab';
import { ProposalService } from '../../../proposal/services/proposal.service';
import { UserService } from '../../../users/services/user.service';

@Component({
  selector: 'app-history-page',
  templateUrl: './history-page.component.html',
  styleUrls: ['./history-page.component.css'],
  imports: [TabsComponent, TableComponent, DescriptionModalComponent]
})
export class HistoryPageComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly titleService = inject(Title);
  private readonly authService = inject(AuthService);
  private readonly proposalService = inject(ProposalService);
  private readonly userService = inject(UserService);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly injector = inject(Injector);

  // 1. Configuración de Pestañas
  readonly tabsConfig: TabItem[] = [
    { label: 'Propuestas Archivadas', value: 'PROPUESTAS' },
    { label: 'Anteproyectos Archivados', value: 'ANTEPROYECTOS' },
    { label: 'Trabajos de Grado Finalizados', value: 'TRABAJOS' },
  ];

  // 2. Diccionario de Estrategias
  private readonly tabStrategies: Record<string, HistoryTabConfiguration> = {
    'PROPUESTAS': ArchivedProposalsTabConfig,
    'ANTEPROYECTOS': ArchivedPreliminaryDraftsTabConfig,
    'TRABAJOS': ArchivedThesisWorksTabConfig
  };

  activeTab = signal<string>('PROPUESTAS');

  // Estado para controlar el modal de descripción
  descriptionModal = { show: false, title: '', content: '' };

  constructor() {
    effect(() => {
      const matchTab = this.tabsConfig.find(t => t.value === this.activeTab());
      const tabLabel = matchTab ? matchTab.label : 'Historial';
      setTimeout(() => {
        this.breadcrumbService.setDynamicBreadcrumb(tabLabel);
        this.breadcrumbService.setDynamicTitle(`Historial - ${tabLabel}`);
        this.titleService.setTitle(`Historial - ${tabLabel}`);
      });
    });
  }

  ngOnInit(): void {}

  ngOnDestroy(): void{
    this.breadcrumbService.clearDynamicBreadcrumb();
    this.breadcrumbService.setDynamicTitle(null);
  }

  // 3. Evaluación de Contexto de Usuario
  evaluationContext = computed<HistoryEvaluationContext>(() => {
    const user = this.authService.currentUser();

    // 👈 NUEVO: Agrupamos los roles institucionales (Asegúrate de que los nombres del enum coincidan con los tuyos)
    const hasGlobalAccess = this.authService.hasAnyRole([
      UserRoleType.ADMINISTRADOR,
      UserRoleType.COMITE,
      UserRoleType.CONSEJO,
      UserRoleType.JEFE_DEP
    ]);

    return {
      currentUser: user,
      hasGlobalAccess, // 👈 NUEVO
      injector: this.injector,
      proposalService: this.proposalService,
      userService: this.userService
    };
  });

  currentStrategy = computed<HistoryTabConfiguration>(() => {
    return this.tabStrategies[this.activeTab()] || ArchivedProposalsTabConfig;
  });

  currentColumns = computed(() => this.currentStrategy().columns);

  currentTableData = computed(() => {
    return this.currentStrategy().getTableData(this.evaluationContext());
  });

  handleTableAction(event: { action: string; row: Record<string, unknown> }): void {
    const rowId = event.row['id'] as string;

    switch (event.action) {
      case 'ver descripcion':
        this.descriptionModal = {
          show: true,
          title: 'Descripción del registro archivado',
          content: (event.row['description'] as string) || 'No hay descripción disponible para este registro.'
        };
        break;

      case 'view-details':
      case 'ver':
        if (this.activeTab() === 'PROPUESTAS') {
          this.router.navigate(['proposal-details', rowId], { relativeTo: this.route });
        }
        else if (this.activeTab() === 'ANTEPROYECTOS') {
          this.router.navigate(['preliminary-draft-details', rowId], { relativeTo: this.route });
        }
        // 🚀 NUEVO: Ruta específica para redirigir a los detalles de los Trabajos de Grado
        else if (this.activeTab() === 'TRABAJOS') {
          this.router.navigate(['thesis-work-details', rowId], { relativeTo: this.route });
        }
        break;

      default:
        console.warn(`Acción no manejada en historial: ${event.action}`);
        break;
    }
  }

  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }
}
