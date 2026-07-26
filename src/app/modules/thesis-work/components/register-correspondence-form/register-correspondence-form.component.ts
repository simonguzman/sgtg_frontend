import { Component, computed, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { RegisterCorrespondenceFormService } from './services/register-correspondence-form.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';

@Component({
  selector: 'app-register-correspondence-form',
  templateUrl: './register-correspondence-form.component.html',
  styleUrls: ['./register-correspondence-form.component.css'],
  imports: [ButtonComponent, DatePipe, InfoBannerComponent],
  providers: [RegisterCorrespondenceFormService]
})
export class RegisterCorrespondenceFormComponent {
  protected readonly formService = inject(RegisterCorrespondenceFormService);

  thesisWork   = input.required<ThesisWork>();
  isSubmitting = input<boolean>(false);
  onSave       = output<File>();
  onGoBack     = output<void>();

  readonly selectedFile = signal<{ fileName: string; file: File } | null>(null);

  private readonly historicalDocuments = computed(() => this.thesisWork().documents ?? []);

  readonly formatoEDoc = computed(() => this.formService.findFormatoE(this.historicalDocuments()));
  readonly formatoFDoc = computed(() => this.formService.findFormatoF(this.historicalDocuments()));
  readonly formatoGDoc = computed(() => this.formService.findFormatoG(this.historicalDocuments()));

  getStudentNames(): string   { return this.formService.getStudentNames(this.thesisWork()); }
  getDirectorName(): string   { return this.formService.getDirectorName(this.thesisWork()); }
  getCodirectorName(): string { return this.formService.getCodirectorName(this.thesisWork()); }
  getAdvisorName(): string    { return this.formService.getAdvisorName(this.thesisWork()); }
  getMemberName(userId: string | undefined): string { return this.formService.getMemberName(userId); }

  downloadDocument(doc: FileDocument | undefined | null): void {
    this.formService.downloadDocument(doc);
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      this.formService.notifyInvalidFileType();
      return;
    }
    this.selectedFile.set({ fileName: file.name, file });
  }

  triggerFileInput(): void {
    document.getElementById('correspondenceFileInput')?.click();
  }

  removeSelectedFile(): void {
    this.selectedFile.set(null);
    const inputElement = document.getElementById('correspondenceFileInput') as HTMLInputElement | null;
    if (inputElement) inputElement.value = '';
  }

  submitForm(): void {
    const fileData = this.selectedFile();
    if (fileData) this.onSave.emit(fileData.file);
  }
}
