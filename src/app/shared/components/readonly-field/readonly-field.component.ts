import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-readonly-field',
  standalone: true,
  templateUrl: './readonly-field.component.html'
})
export class ReadonlyFieldComponent {
  @Input() label = '';
  @Input() value: string | null | undefined = '';
  @Input() emptyText = '';
  @Input() emphasize = false;
}
