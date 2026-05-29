import { Component, inject } from '@angular/core'; // Asegúrate de importar inject
import { AsyncPipe } from '@angular/common'; // Importante para usar | async
import { RouterLink } from '@angular/router';
import { BreadcrumbService } from '../../services/breadcrumb/breadcrumb.service';

@Component({
  selector: 'app-breadcrumb', // O el nombre que tenga tu componente
  standalone: true,
  imports: [AsyncPipe, RouterLink], // Agrega estos imports para que el HTML funcione
  templateUrl: './breadcrumb.component.html'
})
export class BreadcrumbComponent {
  // Inyectamos el servicio
  private breadcrumbService = inject(BreadcrumbService);

  // Exponemos el observable para que el HTML lo use con el pipe async
  breadcrumbs$ = this.breadcrumbService.breadcrumbs$;
}
