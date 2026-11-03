import { Component, EventEmitter, Input, Output } from '@angular/core';
import { StateComponent } from '../../state/state.component';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../button-component/button-component.component';
import { stateList } from '../../../../core/enums/state.enum';

/** Dato del registro con su etiqueta: un texto o una lista de textos. */
export interface RegisterDetailField {
  label: string;
  value?: string;
  values?: string[];
}

@Component({
  selector: 'app-register-information-modal',
  imports: [DialogModule, CommonModule, StateComponent, ButtonComponent, TooltipModule],
  templateUrl: './register-information-modal.component.html',
  styleUrls: ['./register-information-modal.component.css']
})
export class RegisterInformationModalComponent  {
  protected stateList = stateList;

  @Input() modalHeader = 'Detalles de la entrega';
  @Input() subTitle = 'Información del trabajo de grado';
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
  @Input() comments = '';
  /** Datos del registro, cada uno con su etiqueta; si se indican, reemplazan la descripción */
  @Input() fields: RegisterDetailField[] | null = null;
  @Input() modality = '';
  @Input() student = '';
  @Input() director = '';
  @Input() codirector?: string;
  @Input() adviser?: string;
  @Input() chargeDate: Date = new Date;
  @Input() state?:stateList;
  @Input() documents: string[] = [];

  @Output() onClose = new EventEmitter<void>()
  @Output() onDownloadFile = new EventEmitter<string>()

  closeModal() {
    this.onClose.emit()
  }

  downloadFile (fileName: string){
    this.onDownloadFile.emit(fileName);
  }
}
