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
import { SustentationVeredict } from '../../services/thesis-work-sustentation.service';

export interface SustentationEvaluationPayload {
  veredict: SustentationVeredict;
  observations: string;
  evaluationDate: Date;
}

@Component({
  selector: 'app-evaluate-sustentation-form',
  templateUrl: './evaluate-sustentation-form.component.html',
  styleUrls: ['./evaluate-sustentation-form.component.css'],
  imports: [ReactiveFormsModule, FileUploadModalComponent, ButtonComponent, DatePipe, InfoBannerComponent],
  providers: [EvaluateSustentationFormService]
})
export class EvaluateSustentationFormComponent {
  protected readonly formService = inject(EvaluateSustentationFormService);

  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;
  @Output() onSave         = new EventEmitter<{ payload: SustentationEvaluationPayload; file: File }>();
  @Output() onBack         = new EventEmitter<void>();
  @Output() onDownloadFile = new EventEmitter<FileDocument>();

  readonly verdictSelected   = signal<SustentationVeredict | null>(null);
  readonly observations      = signal<string>('');
  readonly uploadedFormat    = signal<{ fileName: string; file: File } | null>(null);
  readonly isModalOpen       = signal<boolean>(false);
  readonly isSubmitAttempted = signal<boolean>(false);

  get states(): typeof stateList { return stateList; }

  get currentSustentation(): SustentationRegistry | null {
    return this.thesisWork?.sustentations?.[0] ?? null;
  }

  // ← Simplificados: delegan directo al servicio con el ThesisWork completo
  getStudentNames(): string   { return this.formService.getStudentNames(this.thesisWork); }
  getDirectorName(): string   { return this.formService.getDirectorName(this.thesisWork); }
  getCodirectorName(): string { return this.formService.getCodirectorName(this.thesisWork); }
  getAdvisorName(): string    { return this.formService.getAdvisorName(this.thesisWork); }
  getAssignedJurors(): string { return this.formService.getAssignedJurors(this.currentSustentation); }

  getExistingDocument(type: string): FileDocument | null {
    return this.formService.getExistingDocument(this.thesisWork, type);
  }

  downloadDocument(doc: FileDocument | null | undefined): void {
    if (doc) this.onDownloadFile.emit(doc);
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
    const verdict  = this.verdictSelected();
    const fileData = this.uploadedFormat();

    if (!verdict) { this.formService.notifyMissingVerdict(); return; }
    if (!fileData) { this.formService.notifyMissingFile(); return; }

    this.onSave.emit({
      payload: { veredict: verdict, observations: this.observations(), evaluationDate: new Date() },
      file: fileData.file
    });
  }
}
