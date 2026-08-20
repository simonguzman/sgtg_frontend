import { Component, computed, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { EvaluateCorrectionsFormService } from './services/evaluate-corrections-form.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { CorrectedDelivery } from '../../interfaces/corrected-delivery.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { Evaluation } from '../../../../core/interfaces/evaluation.interface';

@Component({
  selector: 'app-evaluate-corrections-form',
  templateUrl: './evaluate-corrections-form.component.html',
  styleUrls: ['./evaluate-corrections-form.component.css'],
  standalone: true,
  // ← CommonModule y FormsModule eliminados: el template solo usa @if/@for
  // nativos y bindings de clase nativos — ninguna directiva de esos módulos
  // estaba realmente en uso.
  imports: [FileUploadModalComponent, ButtonComponent, InfoBannerComponent],
  providers: [EvaluateCorrectionsFormService]
})
export class EvaluateCorrectionsFormComponent {
  protected readonly formService = inject(EvaluateCorrectionsFormService);

  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;
  @Output() onSubmitEvaluation = new EventEmitter<{ evaluation: Omit<Evaluation, 'id' | 'date'>; file: File }>();
  @Output() onGoBack = new EventEmitter<void>();

  readonly selectedVerdict   = signal<stateList | null>(null);
  readonly observations      = signal<string>('');
  readonly uploadedFormatG   = signal<{ fileName: string; file: File } | null>(null);
  readonly isModalOpen       = signal<boolean>(false);
  readonly isSubmitAttempted = signal<boolean>(false);

  get states(): typeof stateList { return stateList; }

  readonly correctedDeliveriesList = computed<CorrectedDelivery[]>(() =>
    this.thesisWork?.correctedDeliveries ?? []
  );

  getStudentNames(): string   { return this.formService.getStudentNames(this.thesisWork); }
  getDirectorName(): string   { return this.formService.getDirectorName(this.thesisWork); }
  getCodirectorName(): string { return this.formService.getCodirectorName(this.thesisWork); }
  getAdvisorName(): string    { return this.formService.getAdvisorName(this.thesisWork); }
  getAssignedJurors(): string { return this.formService.getAssignedJurors(this.thesisWork); }

  // ← void: downloadDocument() del servicio ahora es async.
  downloadDocument(doc: FileDocument): void {
    void this.formService.downloadDocument(doc);
  }

  // ← Fix: reemplaza $any($event.target).value por un método con tipado correcto
  onObservationsChange(event: Event): void {
    this.observations.set((event.target as HTMLTextAreaElement).value);
  }

  handleFormatGUploaded(event: { fileName: string; file: File }): void {
    this.uploadedFormatG.set(event);
    this.isModalOpen.set(false);
    this.formService.notifyFileAttached();
  }

  submit(): void {
    this.isSubmitAttempted.set(true);
    const verdict = this.selectedVerdict();

    if (!verdict) { this.formService.notifyMissingVerdict(); return; }
    if (!this.formService.isObservationsValid(this.observations())) {
      this.formService.notifyInvalidObservations();
      return;
    }
    const fileData = this.uploadedFormatG();
    if (!fileData) { this.formService.notifyMissingFormatG(); return; }

    const evaluation = this.formService.buildEvaluationPayload(
      this.thesisWork, verdict, this.observations(), this.correctedDeliveriesList()
    );
    this.onSubmitEvaluation.emit({ evaluation, file: fileData.file });
  }
}
