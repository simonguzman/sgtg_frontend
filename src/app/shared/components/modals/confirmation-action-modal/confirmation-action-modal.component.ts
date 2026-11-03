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

  /**
   * Si la ventana está abierta. El p-dialog se crea la primera vez que se abre ({@link yaSeAbrio}): las
   * páginas tienen varias ventanas que casi nunca se abren y crearlas todas al cargar hacía más lenta la página.
   */
  @Input() set isOpen(valor: boolean) {
    this._isOpen = valor;
    if (valor) this.yaSeAbrio = true;
  }
  get isOpen(): boolean {
    return this._isOpen;
  }
  private _isOpen = false;
  /** Se abrió al menos una vez: desde entonces el p-dialog existe (y se conserva para la animación de cierre). */
  yaSeAbrio = false;
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
