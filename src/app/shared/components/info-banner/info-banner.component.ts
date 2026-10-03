import { Component, input } from '@angular/core';

@Component({
  selector: 'app-info-banner',
  standalone: true,
  templateUrl: 'info-banner.component.html'
})
export class InfoBannerComponent {
  title = input.required<string>();
  icon = input<string>('info');
}
