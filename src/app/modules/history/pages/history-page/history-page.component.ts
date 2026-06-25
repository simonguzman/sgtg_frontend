import { Component, computed, effect, inject, Injector, OnDestroy, OnInit, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { TabItem, TabsComponent } from '../../../../shared/components/tabs/tabs.component';
import { TableComponent } from '../../../../shared/components/table-component/table-component.component';
import { BreadcrumbService } from '../../../../core/services/breadcrumb/breadcrumb.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { UserRoleType } from '../../../../core/models/user-role';
import { DescriptionModalComponent } from '../../../../shared/components/modals/description-modal/description-modal.component';

// Interfaces de Estrategia
import { HistoryEvaluationContext, HistoryTabConfiguration } from '../../interfaces/history-tab-config.interface';
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

  // 1. Configuración de Pestañas (Las 3 sugeridas)
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
    // Sincronización de títulos y breadcrumbs idéntica a tu estándar
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

  ngOnInit(): void {
    // Aquí podrías disparar las recargas de servicios si fuese necesario
  }

  ngOnDestroy(): void{
    this.breadcrumbService.clearDynamicBreadcrumb();
    this.breadcrumbService.setDynamicTitle(null);
  }

  // 3. Evaluación de Contexto de Usuario
  evaluationContext = computed<HistoryEvaluationContext>(() => {
    const user = this.authService.currentUser();
    const isAdmin = this.authService.hasAnyRole([UserRoleType.ADMINISTRADOR]);

    return {
      currentUser: user,
      isAdmin,
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
        // Abrimos el modal con la descripción de la fila actual
        this.descriptionModal = {
          show: true,
          title: 'Descripción del registro archivado',
          content: (event.row['description'] as string) || 'No hay descripción disponible para este registro.'
        };
        break;

      case 'view-details':
      case 'ver':
        // 🚀 ESTRATEGIA 2: Navegación directa al módulo correspondiente
        if (this.activeTab() === 'PROPUESTAS') {
          // Redirigimos directamente a la ruta que ya tienes en proposal.routes.ts
          this.router.navigate(['proposal-details', rowId], { relativeTo: this.route });
        } else {
          // Para anteproyectos y trabajos
          this.router.navigate(['view-archive', this.activeTab().toLowerCase(), rowId], { relativeTo: this.route });
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
