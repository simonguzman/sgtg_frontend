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

  @Input() isOpen: boolean = false;
  @Input() name: string = '';
  @Input() role: string = '';
  @Input() evaluationDate: Date = new Date;
  @Input() state?:stateList;
  @Input() comments: string = '';
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
