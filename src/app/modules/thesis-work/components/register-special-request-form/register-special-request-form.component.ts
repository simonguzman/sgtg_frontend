import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { ReadonlyFieldComponent } from '../../../../shared/components/readonly-field/readonly-field.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { EXTENSION_MONTHS, RegisterSpecialRequestFormService } from './services/register-special-request-form.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { SpecialRequestType } from '../../enums/special-request-type.enum';
import { SpecialRequestSubmission } from '../../services/thesis-work-special-request.service';
import { availableRequestTypes } from '../../helpers/special-request-availability.helper';

/** Texto de ayuda para el documento de cada solicitud. */
const DOCUMENT_HINTS: Partial<Record<SpecialRequestType, string>> = {
  [SpecialRequestType.PRORROGA]: 'Solicitud de prórroga firmada por el director (PDF)',
  [SpecialRequestType.SUSPENSION]: 'Solicitud de suspensión firmada por el director (PDF)',
  [SpecialRequestType.REANUDACION]: 'Documento de reanudación del trabajo de grado (PDF)',
  [SpecialRequestType.CANCELACION]: 'Formato de cancelación del trabajo de grado (PDF)'
};

@Component({
  selector: 'app-register-special-request-form',
  templateUrl: './register-special-request-form.component.html',
  styleUrls: ['./register-special-request-form.component.css'],
  imports: [DatePipe, ReactiveFormsModule, ButtonComponent, InfoBannerComponent, ReadonlyFieldComponent, FileUploadModalComponent],
  providers: [RegisterSpecialRequestFormService]
})
export class RegisterSpecialRequestFormComponent implements OnInit {
  protected readonly formService = inject(RegisterSpecialRequestFormService);
  protected readonly types = SpecialRequestType;
  protected readonly monthOptions = EXTENSION_MONTHS;

  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;
  @Output() onSaveRequest = new EventEmitter<SpecialRequestSubmission>();

  public readonly isSubmitAttempted = signal(false);
  public readonly selectedType = signal<SpecialRequestType | ''>('');
  public readonly document = signal<{ fileName: string; file: File } | null>(null);
  public readonly isUploadModalOpen = signal(false);

  get requestForm() { return this.formService.form; }
  get objectives() { return this.formService.objectives; }
  /** Tipos que el director puede registrar en la etapa actual. */
  get requestOptions(): SpecialRequestType[] { return availableRequestTypes(this.thesisWork); }
  get documentHint(): string { return DOCUMENT_HINTS[this.selectedType() as SpecialRequestType] ?? ''; }
  get requiresDocument(): boolean { return !!this.selectedType() && this.selectedType() !== SpecialRequestType.CAMBIO_TITULO; }

  ngOnInit(): void {
    this.formService.loadCurrentDescription(this.thesisWork);
    this.requestForm.controls.requestType.valueChanges.subscribe(type => {
      this.selectedType.set(type);
      this.document.set(null);
      this.isSubmitAttempted.set(false);
    });
  }

  getStudentNames(): string { return this.formService.getStudentNames(this.thesisWork); }
  getDirectorName(): string { return this.formService.getDirectorName(this.thesisWork); }
  getCodirectorName(): string { return this.formService.getCodirectorName(this.thesisWork); }
  getAdvisorName(): string { return this.formService.getAdvisorName(this.thesisWork); }

  addObjective(): void { this.formService.addObjective(); }
  removeObjective(index: number): void { this.formService.removeObjective(index); }

  handleFileUploaded(event: { fileName: string; file: File }): void {
    this.document.set(event);
    this.isUploadModalOpen.set(false);
  }

  public isFieldInvalid(fieldName: 'requestType' | 'title' | 'justification'): boolean {
    if (!this.isSubmitAttempted()) return false;
    const value = this.requestForm.controls[fieldName].value;
    return !String(value ?? '').trim();
  }

  public isObjectiveInvalid(index: number): boolean {
    return this.isSubmitAttempted() && !this.objectives.at(index).value.trim();
  }

  public submit(): void {
    this.isSubmitAttempted.set(true);
    const raw = this.requestForm.getRawValue();
    const type = raw.requestType;
    if (!type) {
      this.formService.notifyIncompleteForm();
      return;
    }

    if (type === SpecialRequestType.CAMBIO_TITULO) {
      const objectives = raw.objectives.map(objective => objective.trim());
      if (!raw.title.trim() || !raw.justification.trim() || objectives.some(objective => !objective)) {
        this.formService.notifyIncompleteForm('Complete el título, todos los objetivos y la justificación del cambio.');
        return;
      }
      this.onSaveRequest.emit({
        requestType: type,
        title: raw.title.trim(),
        objectives,
        justification: raw.justification.trim()
      });
      return;
    }

    const file = this.document()?.file;
    if (!file) {
      this.formService.notifyIncompleteForm('Adjunte el documento de la solicitud en PDF.');
      return;
    }
    switch (type) {
      case SpecialRequestType.PRORROGA:
        this.onSaveRequest.emit({ requestType: type, months: Number(raw.months), document: file });
        break;
      case SpecialRequestType.SUSPENSION:
      case SpecialRequestType.REANUDACION:
      case SpecialRequestType.CANCELACION:
        this.onSaveRequest.emit({ requestType: type, document: file });
        break;
      default:
        this.formService.notifyIncompleteForm('Este tipo de solicitud aún no está disponible.');
    }
  }
}
