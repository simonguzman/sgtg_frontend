import { Routes } from '@angular/router';
import { StatisticsPageComponent } from './pages/statistics-page/statistics-page.component';
import { roleGuard } from '../../core/guards/role.guard';
import { STATISTICS_ROLES } from './models/statistics-options.model';

/** Ruta de la página de estadísticas. */
export const statisticsRoutes: Routes = [
  {
    path: '',
    component: StatisticsPageComponent,
    canActivate: [roleGuard],
    title: 'Estadísticas',
    data: { breadcrumb: 'Estadísticas', roles: STATISTICS_ROLES }
  }
]
