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
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly deadlineMonitor = inject(DeadlineMonitorService);

  constructor() {
    this.deadlineMonitor.checkDeadlines();
  }

  private readonly staticRouteTitle = computed<string>(() =>
    getDeepestRouteTitle(this.breadcrumbService.routerStateSnapshot().root)
  );

  protected readonly currentPageTitle = computed<string>(() =>
    this.breadcrumbService.dynamicTitle() ?? this.staticRouteTitle()
  );
}
