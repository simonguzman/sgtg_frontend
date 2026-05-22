import { Component, EventEmitter, Input, Output } from '@angular/core';
import { StateComponent } from '../../state/state.component';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../../button-component/button-component.component';
import { stateList } from '../../../../core/enums/state.enum';

@Component({
  selector: 'app-register-information-modal',
  imports: [DialogModule, CommonModule, StateComponent, ButtonComponent, TooltipModule],
  templateUrl: './register-information-modal.component.html',
  styleUrls: ['./register-information-modal.component.css']
})
export class RegisterInformationModalComponent  {
  protected stateList = stateList;

  @Input() modalHeader: string = 'Detalles de la entrega'; // Título en la barra azul
  @Input() subTitle: string = 'Información del trabajo de grado'; // Título de la sección
  @Input() isOpen: boolean = false;
  @Input() title: string = '';
  @Input() comments: string = '';
  @Input() modality: string = '';
  @Input() student: string = '';
  @Input() director: string = '';
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
