import { Routes } from '@angular/router';
import { NotificationsPageComponent } from './pages/notifications-page/notifications-page.component';

/** Ruta de la bandeja de entrada. */
export const notificationsRoutes: Routes = [
  {
    path: '',
    component: NotificationsPageComponent,
    title: 'Notificaciones',
    data: { breadcrumb: 'Notificaciones' }
  }
]
