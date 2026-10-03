import { Component, computed, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { RegisterCorrespondenceFormService } from './services/register-correspondence-form.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';

@Component({
  selector: 'app-register-correspondence-form',
  templateUrl: './register-correspondence-form.component.html',
  styleUrls: ['./register-correspondence-form.component.css'],
  imports: [ButtonComponent, DatePipe, InfoBannerComponent, FileUploadModalComponent],
  providers: [RegisterCorrespondenceFormService]
})
export class RegisterCorrespondenceFormComponent {
  protected readonly formService = inject(RegisterCorrespondenceFormService);
  thesisWork = input.required<ThesisWork>();
  isSubmitting = input<boolean>(false);
  onSave = output<File>();
  onGoBack = output<void>();

  readonly selectedFile = signal<{ fileName: string; file: File } | null>(null);
  readonly isModalOpen  = signal(false);

  private readonly historicalDocuments = computed(() => this.thesisWork().documents ?? []);
  readonly formatoEDoc = computed(() => this.formService.findFormatoE(this.historicalDocuments()));
  readonly formatoFDoc = computed(() => this.formService.findFormatoF(this.historicalDocuments()));
  readonly formatoGDoc = computed(() => this.formService.findFormatoG(this.historicalDocuments()));

  getStudentNames(): string { return this.formService.getStudentNames(this.thesisWork()); }
  getDirectorName(): string { return this.formService.getDirectorName(this.thesisWork()); }
  getCodirectorName(): string { return this.formService.getCodirectorName(this.thesisWork()); }
  getAdvisorName(): string { return this.formService.getAdvisorName(this.thesisWork()); }
  getMemberName(userId: string | undefined): string { return this.formService.getMemberName(userId); }

  downloadDocument(document: FileDocument | undefined | null): void {
    void this.formService.downloadDocument(document);
  }

  handleFileUploaded(event: { fileName: string; file: File }): void {
    this.selectedFile.set(event);
    this.isModalOpen.set(false);
  }

  removeSelectedFile(): void {
    this.selectedFile.set(null);
  }

  submitForm(): void {
    const fileData = this.selectedFile();
    if (fileData) this.onSave.emit(fileData.file);
  }
}
