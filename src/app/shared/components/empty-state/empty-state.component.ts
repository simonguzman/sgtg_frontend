import { Component, Input } from '@angular/core';
import { CardModule } from 'primeng/card';

/** Mensaje que se muestra cuando una tabla o lista no tiene datos. */
@Component({
  selector: 'app-empty-state',
  imports: [CardModule],
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.css']
})
export class EmptyStateComponent {

  @Input() message = '';

}
