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
  @Input() isOpen = false;
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
