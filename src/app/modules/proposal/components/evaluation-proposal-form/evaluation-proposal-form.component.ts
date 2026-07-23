import { Component, inject, input, output, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Proposal } from '../../interfaces/proposal.interface';
import { User } from '../../../users/interfaces/user.interface';
import { EvaluationProposalFormService } from './services/evaluation-proposal-form.service';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';

@Component({
  selector: 'app-evaluation-proposal-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FileUploadModalComponent,
    ConfirmationActionModalComponent,
    ButtonComponent,
    InfoBannerComponent
  ],
  providers: [EvaluationProposalFormService],
  templateUrl: './evaluation-proposal-form.component.html',
  styleUrls: ['./evaluation-proposal-form.component.css']
})
export class EvaluationProposalFormComponent {
  protected readonly formService = inject(EvaluationProposalFormService);

  proposal = input.required<Proposal>();
  onDownloadOriginal = output<void>();
  onSaveEvaluation = output<{ result: string; comments: string; signedFileName: string }>();
  onGoBack = output<void>();

  readonly signedFile = signal<{ name: string } | null>(null);
  readonly formSubmitted = signal<boolean>(false);
  readonly modalState = signal({ upload: false, confirm: false });

  get evaluationForm() {
    return this.formService.evaluationForm;

  }
  get originalDocument() {
    return this.formService.resolveOriginalDocument(this.proposal());
  }

  get currentDocument() {
    return this.formService.resolveCurrentDocument(this.proposal());
  }

  get documentUploadDate() {
    return this.formService.formatUploadDate(this.currentDocument);
  }

  get isFileInvalid(): boolean {
    return this.formSubmitted() && !this.signedFile();
  }

  getStudentNames(authors: User[] | undefined): string {
    return this.formService.getStudentNames(authors);
  }

  getDirectorName(id: string): string {
    return this.formService.getMemberName(id);
  }

  getCodirectorName(id?: string): string {
    return id ? this.formService.getMemberName(id) : '';
  }

  getAdvisorName(id?: string): string {
    return id ? this.formService.getMemberName(id) : '';
  }

  setUploadModal(isOpen: boolean): void {
    this.modalState.update(state => ({ ...state, upload: isOpen }));
  }

  setConfirmModal(isOpen: boolean): void {
    this.modalState.update(state => ({ ...state, confirm: isOpen }));
  }

  handleFileUploaded(event: { fileName: string; file: File }): void {
    this.signedFile.set({ name: event.fileName });
    this.setUploadModal(false);
    this.formService.notifyFileUploaded();
  }

  removeSignedFile(): void {
    this.signedFile.set(null);
    this.formService.notifyFileRemoved();
  }

  initiateEvaluationSubmit(): void {
    this.formSubmitted.set(true);
    if (this.evaluationForm.invalid) {
      this.evaluationForm.markAllAsTouched();
      this.formService.notifyInvalidForm();
      return;
    }
    if (!this.signedFile()) {
      this.formService.notifyMissingFile();
      return;
    }
    this.setConfirmModal(true);
  }

  cancelEvaluation(): void {
    this.setConfirmModal(false);
  }

  confirmEvaluation(): void {
    this.setConfirmModal(false);
    const { result, comments } = this.evaluationForm.value;
    this.onSaveEvaluation.emit({
      result: result!,
      comments: comments!,
      signedFileName: this.signedFile()!.name
    });
  }

  goBack(): void {
    this.onGoBack.emit();
  }

  downloadOriginalDocument(): void {
    this.onDownloadOriginal.emit();
  }
}
