import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonComponent } from '../../button-component/button-component.component';

/**
 * Anulación de un trabajo de grado por el director (borrado lógico): pide la
 * justificación, que es obligatoria, y avisa que el trabajo pasa al historial.
 */
@Component({
  selector: 'app-annul-work-modal',
  imports: [DialogModule, ButtonComponent],
  templateUrl: './annul-work-modal.component.html'
})
export class AnnulWorkModalComponent {
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
  @Input() title = '';
  @Input() loading = false;

  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<string>();

  protected readonly justification = signal('');
  protected readonly showError = signal(false);

  protected updateJustification(value: string): void {
    this.justification.set(value);
    if (value.trim()) this.showError.set(false);
  }

  closeModal(): void {
    this.justification.set('');
    this.showError.set(false);
    this.onClose.emit();
  }

  confirmAction(): void {
    const justification = this.justification().trim();
    if (!justification) {
      this.showError.set(true);
      return;
    }
    this.confirm.emit(justification);
  }
}
