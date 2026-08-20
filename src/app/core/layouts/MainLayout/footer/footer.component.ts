import { Component } from '@angular/core';
import { APP_VERSION, getCurrentYear } from '../../../utils/app-metadata-utils';

@Component({
  selector: 'app-footer',
  imports: [],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
})
export class FooterComponent {
  protected readonly currentYear = getCurrentYear();
  protected readonly version = APP_VERSION;
}
