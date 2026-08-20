import { Component } from '@angular/core';
import { APP_VERSION, getCurrentYear } from '../../../utils/app-metadata-utils';

@Component({
  selector: 'app-auth-footer',
  // ← CommonModule eliminado: el template solo usa interpolación simple
  // ({{ version }}, {{ currentYear }}), sin directivas ni pipes.
  imports: [],
  templateUrl: './auth-footer.component.html',
  styleUrls: ['./auth-footer.component.css']
})
export class AuthFooterComponent {
  protected readonly currentYear = getCurrentYear();
  protected readonly version = APP_VERSION;
}
