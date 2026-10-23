import { Component, input } from '@angular/core';

/**
 * Aviso breve dentro de un formulario (ej. debajo de un campo). Mismo estilo
 * que `app-info-banner`, pero compacto y sin título.
 */
@Component({
  selector: 'app-inline-notice',
  standalone: true,
  templateUrl: './inline-notice.component.html'
})
export class InlineNoticeComponent {
  icon = input<string>('info');
}
