import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BreadcrumbService } from '../../services/breadcrumb/breadcrumb.service';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './breadcrumb.component.html'
})
export class BreadcrumbComponent {
  private readonly breadcrumbService = inject(BreadcrumbService);
  protected readonly breadcrumbs = this.breadcrumbService.breadcrumbs;
}
