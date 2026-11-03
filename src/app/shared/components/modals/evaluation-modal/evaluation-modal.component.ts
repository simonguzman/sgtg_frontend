import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { StateComponent } from '../../state/state.component';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../button-component/button-component.component';
import { TooltipModule } from 'primeng/tooltip';
import { stateList } from '../../../../core/enums/state.enum';
import { FormattedDocument } from '../../../../core/interfaces/formatted-document.interface';
@Component({
  selector: 'app-evaluation-modal',
  imports: [DialogModule, CommonModule, StateComponent, ButtonComponent, TooltipModule],
  templateUrl: './evaluation-modal.component.html',
  styleUrls: ['./evaluation-modal.component.css']
})
export class EvaluationModalComponent{

  protected stateList = stateList;

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
  @Input() name = '';
  @Input() role = '';
  @Input() evaluationDate: Date = new Date;
  @Input() state?:stateList;
  @Input() comments = '';
  @Input() documents: FormattedDocument[] = [];

  @Output() onClose = new EventEmitter<void>()
  @Output() onDownloadFile = new EventEmitter<FormattedDocument>()

  closeModal() {
    this.onClose.emit()
  }
  downloadFile (document: FormattedDocument){
    this.onDownloadFile.emit(document);
  }
}
