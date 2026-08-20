import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-description-modal',
  imports: [DialogModule],
  templateUrl: './description-modal.component.html',
  styleUrls: ['./description-modal.component.css']
})
export class DescriptionModalComponent {

  @Input() isOpen: boolean = false
  @Input() titleDescription: string = ''
  @Input() description: string = ''

  @Output() onClose = new EventEmitter<void>;

  closeModal(){
    this.onClose.emit()
  }
}
