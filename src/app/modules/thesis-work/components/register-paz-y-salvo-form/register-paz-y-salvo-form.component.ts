import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { RegisterPazYSalvoFormService } from './services/register-paz-y-salvo-form.service';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { PazYSalvoPayload } from '../../interfaces/paz-y-salvo-playload.interface';
// ← stateList eliminado: solo se usaba dentro de getExistingDocument,
// que ahora vive en el servicio (y ya no lo necesita, delega al resolver).

@Component({
  selector: 'app-register-paz-y-salvo-form',
  imports: [FileUploadModalComponent, ButtonComponent, InfoBannerComponent],
  providers: [RegisterPazYSalvoFormService],
  templateUrl: './register-paz-y-salvo-form.component.html',
  styleUrls: ['./register-paz-y-salvo-form.component.css']
})
export class RegisterPazYSalvoFormComponent {
  protected readonly formService = inject(RegisterPazYSalvoFormService);

  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;
  @Output() onSave         = new EventEmitter<{ payload: PazYSalvoPayload; file: File }>();
  @Output() onGoBack       = new EventEmitter<void>();
  @Output() onDownloadFile = new EventEmitter<FileDocument>();

  readonly academicApproved  = signal<boolean | null>(null);
  readonly academicComments  = signal<string>('');
  readonly financialApproved = signal<boolean | null>(null);
  readonly financialComments = signal<string>('');
  readonly uploadedFormat    = signal<{ fileName: string; file: File } | null>(null);
  readonly isModalOpen       = signal(false);
  readonly isSubmitAttempted = signal(false);

  // ← Simplificados: delegan directo al servicio, sin extracción manual de IDs
  getStudentNames(): string   { return this.formService.getStudentNames(this.thesisWork); }
  getDirectorName(): string   { return this.formService.getDirectorName(this.thesisWork); }
  getCodirectorName(): string { return this.formService.getCodirectorName(this.thesisWork); }
  getAdvisorName(): string    { return this.formService.getAdvisorName(this.thesisWork); }

  onAcademicCommentsChange(event: Event): void {
    this.academicComments.set((event.target as HTMLTextAreaElement).value);
  }
  onFinancialCommentsChange(event: Event): void {
    this.financialComments.set((event.target as HTMLTextAreaElement).value);
  }

  // ← Simplificado: de ~20 líneas de lógica de resolución a una sola
  // delegación. La lógica real vive ahora en el servicio, reutilizando
  // ThesisFinalDeliveryDocumentResolverService.
  getExistingDocument(type: string): FileDocument | null {
    return this.formService.getExistingDocument(this.thesisWork, type);
  }

  handleFileUploaded(event: { fileName: string; file: File }): void {
    this.uploadedFormat.set(event);
    this.isModalOpen.set(false);
    this.formService.notifyFileAttached(event.fileName);
  }

  removeFile(): void { this.uploadedFormat.set(null); }

  downloadDocument(doc: FileDocument | null): void {
    if (doc) this.onDownloadFile.emit(doc);
  }

  submit(): void {
    this.isSubmitAttempted.set(true);
    const acApp  = this.academicApproved();
    const finApp = this.financialApproved();

    if (acApp === null || finApp === null) {
      this.formService.notifyMissingEvaluations();
      return;
    }
    const fileData = this.uploadedFormat();
    if (!fileData) {
      this.formService.notifyMissingDocument();
      return;
    }

    this.onSave.emit({
      payload: {
        academicApproved:  acApp,
        academicComments:  this.academicComments(),
        financialApproved: finApp,
        financialComments: this.financialComments()
      },
      file: fileData.file
    });
  }
}
