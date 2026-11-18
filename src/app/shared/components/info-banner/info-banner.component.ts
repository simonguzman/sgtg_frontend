import { Component, input } from '@angular/core';

/** Recuadro informativo con título e icono; el contenido se proyecta dentro. */
@Component({
  selector: 'app-info-banner',
  standalone: true,
  templateUrl: 'info-banner.component.html'
})
export class InfoBannerComponent {
  title = input.required<string>();
  icon = input<string>('info');
}
