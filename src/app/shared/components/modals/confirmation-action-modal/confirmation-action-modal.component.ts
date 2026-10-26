import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonComponent } from '../../button-component/button-component.component';

@Component({
  selector: 'app-confirmation-action-modal',
  imports: [DialogModule, ButtonComponent],
  templateUrl: './confirmation-action-modal.component.html',
  styleUrls: ['./confirmation-action-modal.component.css']
})
export class ConfirmationActionModalComponent implements OnChanges {

  @Input() isOpen: boolean = false;
  @Input() description: string = '';

  @Output() onClose = new EventEmitter<void>()
  @Output() confirm = new EventEmitter<void>()

  /**
   * Ya se confirmó en esta apertura: un doble clic mientras el modal se cierra
   * no vuelve a enviar la acción (la segunda chocaba con la primera en el backend).
   */
  confirmed = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue) this.confirmed = false;
  }

  closeModal() {
    this.onClose.emit()
  }

  confirmAction(){
    if (this.confirmed) return;
    this.confirmed = true;
    this.confirm.emit();
    this.closeModal();
  }
}
