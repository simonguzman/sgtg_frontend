import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-readonly-field',
  standalone: true,
  templateUrl: './readonly-field.component.html'
})
export class ReadonlyFieldComponent {
  @Input() label = '';
  @Input() value: string | null | undefined = '';
  /** Varios valores (ej. objetivos específicos): se muestran como lista en lugar de `value` */
  @Input() values: string[] | null = null;
  @Input() emptyText = '';
  @Input() emphasize = false;
}
