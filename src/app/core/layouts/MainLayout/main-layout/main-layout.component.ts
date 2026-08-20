import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FooterComponent } from '../footer/footer.component';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { BreadcrumbComponent } from '../../../components/breadcrumb/breadcrumb.component';
import { BreadcrumbService } from '../../../services/breadcrumb/breadcrumb.service';
import { DeadlineMonitorService } from '../../../../modules/notifications/services/deadline-monitor.service';
import { getDeepestRouteTitle } from './helpers/deepest-route-title.helper';

@Component({
  selector: 'app-main-layout',
  imports: [FooterComponent, RouterModule, HeaderComponent, SidebarComponent, BreadcrumbComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css',
})
export class MainLayoutComponent {
  // ← Router, NavigationEnd, toSignal, filter, map ya no se necesitan
  // aquí: se elimina la suscripción propia a router.events, que duplicaba
  // exactamente lo que BreadcrumbService.routerStateSnapshot ya calcula.
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly deadlineMonitor = inject(DeadlineMonitorService);

  constructor() {
    this.deadlineMonitor.checkDeadlines();
  }

  // ← Deriva del signal público de BreadcrumbService en vez de mantener
  // un toSignal(router.events...) propio en paralelo. computed() en vez
  // de toSignal() porque ya no hay observable propio que envolver, solo
  // se deriva de un signal existente — y computed() es lazy (no se evalúa
  // en el constructor, solo cuando el template la lee), lo cual es
  // estrictamente más seguro que el initialValue eager que causaba el
  // bug original.
  private readonly staticRouteTitle = computed<string>(() =>
    getDeepestRouteTitle(this.breadcrumbService.routerStateSnapshot().root)
  );

  protected readonly currentPageTitle = computed<string>(() =>
    this.breadcrumbService.dynamicTitle() ?? this.staticRouteTitle()
  );
}
