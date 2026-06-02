import { Component, input } from '@angular/core';

@Component({
  selector: 'app-info-banner',
  standalone: true,
  templateUrl: 'info-banner.component.html'
})
export class InfoBannerComponent {
  // El título es obligatorio
  title = input.required<string>();

  // El ícono es opcional, por defecto será 'info'
  icon = input<string>('info');
}
