import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-description-modal',
  imports: [DialogModule],
  templateUrl: './description-modal.component.html',
  styleUrls: ['./description-modal.component.css']
})
export class DescriptionModalComponent {

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
  @Input() titleDescription: string = ''
  @Input() description: string = ''

  @Output() onClose = new EventEmitter<void>;

  closeModal(){
    this.onClose.emit()
  }
}
