import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { EvaluateSustentationFormService } from './services/evaluate-sustentation-form.service';
import { stateList } from '../../../../core/enums/state.enum';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { SustentationRegistry } from '../../interfaces/sustentation-registry.interface';
import { ReadonlyFieldComponent } from '../../../../shared/components/readonly-field/readonly-field.component';
import { ProposalContentFieldsComponent } from '../../../../shared/components/proposal-content-fields/proposal-content-fields.component';

/** Calificación del coordinador o la inasistencia del estudiante. */
export type SustentationVeredict =
  | stateList.APROBADO | stateList.APROBADO_CON_OBSERVACIONES | stateList.NO_APROBADO | stateList.APLAZADO
  | 'INASISTENCIA';

/** Inasistencia del estudiante: aplaza la primera sesión y cierra el trabajo en la segunda. */
export const INASISTENCIA = 'INASISTENCIA' as const;

export interface SustentationEvaluationPayload {
  veredict: SustentationVeredict;
  observations: string;
  evaluationDate: Date;
}

@Component({
  selector: 'app-evaluate-sustentation-form',
  templateUrl: './evaluate-sustentation-form.component.html',
  styleUrls: ['./evaluate-sustentation-form.component.css'],
  imports: [ReadonlyFieldComponent, ProposalContentFieldsComponent, ReactiveFormsModule, FileUploadModalComponent, ButtonComponent, DatePipe, InfoBannerComponent],
  providers: [EvaluateSustentationFormService]
})
export class EvaluateSustentationFormComponent {
  protected readonly formService = inject(EvaluateSustentationFormService);

  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;
  /** El acta es obligatoria salvo en la inasistencia */
  @Output() onSave = new EventEmitter<{ payload: SustentationEvaluationPayload; file: File | null }>();
  @Output() onBack = new EventEmitter<void>();
  @Output() onDownloadFile = new EventEmitter<FileDocument>();

  readonly verdictSelected = signal<SustentationVeredict | null>(null);
  readonly observations = signal<string>('');
  readonly uploadedFormat = signal<{ fileName: string; file: File } | null>(null);
  readonly isModalOpen = signal<boolean>(false);
  readonly isSubmitAttempted = signal<boolean>(false);

  get states(): typeof stateList { return stateList; }
  protected readonly inasistencia = INASISTENCIA;

  /** La inasistencia no lleva acta, pero sí observaciones */
  get isNonAttendance(): boolean { return this.verdictSelected() === INASISTENCIA; }

  get currentSustentation(): SustentationRegistry | null {
    return this.thesisWork?.sustentations?.[0] ?? null;
  }

  getStudentNames(): string   { return this.formService.getStudentNames(this.thesisWork); }
  getDirectorName(): string   { return this.formService.getDirectorName(this.thesisWork); }
  getCodirectorName(): string { return this.formService.getCodirectorName(this.thesisWork); }
  getAdvisorName(): string    { return this.formService.getAdvisorName(this.thesisWork); }
  getAssignedJurors(): string { return this.formService.getAssignedJurors(this.currentSustentation); }

  getExistingDocument(type: string): FileDocument | null {
    return this.formService.getExistingDocument(this.thesisWork, type);
  }

  downloadDocument(document: FileDocument | null | undefined): void {
    if (document) this.onDownloadFile.emit(document);
  }

  onObservationsChange(event: Event): void {
    this.observations.set((event.target as HTMLTextAreaElement).value);
  }

  handleFileUploaded(event: { fileName: string; file: File }): void {
    this.uploadedFormat.set(event);
    this.isModalOpen.set(false);
    this.formService.notifyFileAttached(event.fileName);
  }

  removeFile(): void { this.uploadedFormat.set(null); }

  submit(): void {
    this.isSubmitAttempted.set(true);
    const verdict = this.verdictSelected();
    const fileData = this.uploadedFormat();

    if (!verdict) { this.formService.notifyMissingVerdict(); return; }
    if (verdict !== stateList.APROBADO && !this.observations().trim()) {
      this.formService.notifyMissingObservations();
      return;
    }
    if (!fileData && verdict !== INASISTENCIA) { this.formService.notifyMissingFile(); return; }

    this.onSave.emit({
      payload: { veredict: verdict, observations: this.observations(), evaluationDate: new Date() },
      file: verdict === INASISTENCIA ? null : fileData!.file
    });
  }
}
