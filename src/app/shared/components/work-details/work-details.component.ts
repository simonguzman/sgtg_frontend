import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ButtonComponent } from '../button-component/button-component.component';
import { WorkDetailsDocument, WorkDetailsView } from './work-details.model';

/**
 * Cuerpo de las páginas de detalle de la propuesta, el anteproyecto y el
 * trabajo de grado: información, fechas, participantes y documentos. Solo
 * muestra los datos que tiene la vista (ver `buildWorkDetailsView`).
 */
@Component({
  selector: 'app-work-details',
  imports: [ButtonComponent, DatePipe],
  templateUrl: './work-details.component.html',
  styleUrls: ['./work-details.component.css']
})
export class WorkDetailsComponent {
  @Input({ required: true }) view!: WorkDetailsView;
  @Output() download = new EventEmitter<WorkDetailsDocument>();
}
