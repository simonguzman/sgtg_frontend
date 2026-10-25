import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { ReadonlyFieldComponent } from '../../../../shared/components/readonly-field/readonly-field.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { EvaluateSpecialRequestFormService } from './services/evaluate-special-request-form.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { SpecialRequest } from '../../interfaces/special-request.interface';
import { SpecialRequestType } from '../../enums/special-request-type.enum';
import { SpecialRequestDecision } from '../../services/thesis-work-special-request.service';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { ProposalContentFieldsComponent } from '../../../../shared/components/proposal-content-fields/proposal-content-fields.component';

type SpecialRequestVerdict = stateList.APROBADO | stateList.NO_APROBADO;

/**
 * Decisión del Consejo de Facultad sobre una solicitud del director: aprueba o
 * no aprueba, con la resolución en PDF (obligatoria) y observaciones opcionales.
 * Las fechas resultantes (nuevo plazo, reanudación) las calcula el backend.
 */
@Component({
  selector: 'app-evaluate-special-request-form',
  templateUrl: './evaluate-special-request-form.component.html',
  styleUrls: ['./evaluate-special-request-form.component.css'],
  imports: [ProposalContentFieldsComponent, ButtonComponent, InfoBannerComponent, ReadonlyFieldComponent, FileUploadModalComponent],
  providers: [EvaluateSpecialRequestFormService]
})
export class EvaluateSpecialRequestFormComponent {
  protected readonly formService = inject(EvaluateSpecialRequestFormService);
  protected readonly types = SpecialRequestType;

  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input({ required: true }) specialRequest!: SpecialRequest;
  @Input() isSubmitting = false;
  @Output() onSave = new EventEmitter<SpecialRequestDecision>();
  @Output() onBack = new EventEmitter<void>();
  @Output() onDownloadDocument = new EventEmitter<FileDocument>();

  readonly verdictSelected  = signal<SpecialRequestVerdict | null>(null);
  readonly observations = signal<string>('');
  readonly resolution = signal<{ fileName: string; file: File } | null>(null);
  readonly isUploadModalOpen = signal(false);
  readonly isSubmitAttempted = signal(false);
  /** Nueva fecha de sustentación: fecha (YYYY-MM-DD), hora (HH:mm) y salón que fija el Consejo al aprobar */
  readonly newDate = signal('');
  readonly newTime = signal('');
  readonly newLocation = signal('');

  /** true si al aprobar se debe fijar la nueva fecha de la sesión */
  get requiresNewDate(): boolean {
    return this.getRequestType() === SpecialRequestType.NUEVA_SUSTENTACION && this.verdictSelected() === stateList.APROBADO;
  }

  get states(): typeof stateList { return stateList; }

  getStudentNames(): string { return this.formService.getStudentNames(this.thesisWork); }
  getDirectorName(): string { return this.formService.getDirectorName(this.thesisWork); }
  getCodirectorName(): string { return this.formService.getCodirectorName(this.thesisWork); }
  getAdvisorName(): string { return this.formService.getAdvisorName(this.thesisWork); }

  getRequestType(): SpecialRequestType {
    return this.specialRequest.requestType;
  }

  onInput(target: 'date' | 'time' | 'location', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (target === 'date') this.newDate.set(value);
    if (target === 'time') this.newTime.set(value);
    if (target === 'location') this.newLocation.set(value);
  }

  onObservationsChange(event: Event): void {
    this.observations.set((event.target as HTMLTextAreaElement).value);
  }

  handleResolutionUploaded(event: { fileName: string; file: File }): void {
    this.resolution.set(event);
    this.isUploadModalOpen.set(false);
  }

  submit(): void {
    this.isSubmitAttempted.set(true);
    const verdict = this.verdictSelected();

    if (!verdict) {
      this.formService.notifyMissingVerdict();
      return;
    }
    const resolution = this.resolution()?.file;
    if (!resolution) {
      this.formService.notifyMissingResolution();
      return;
    }

    if (this.requiresNewDate && (!this.newDate() || !this.newTime())) {
      this.formService.notifyMissingNewDate();
      return;
    }

    this.onSave.emit({
      status: verdict, resolutionDetails: this.observations(), resolution,
      ...(this.requiresNewDate ? { newDateTime: `${this.newDate()}T${this.newTime()}:00`, newLocation: this.newLocation() } : {})
    });
  }
}
