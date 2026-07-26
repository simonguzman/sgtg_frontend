import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { RegisterPazYSalvoFormService } from './services/register-paz-y-salvo-form.service';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { PazYSalvoPayload } from '../../interfaces/paz-y-salvo-playload.interface';
import { stateList } from '../../../../core/enums/state.enum';

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

  // ── Estado de UI ──────────────────────────────────────────────────────────
  readonly academicApproved  = signal<boolean | null>(null);
  readonly academicComments  = signal<string>('');
  readonly financialApproved = signal<boolean | null>(null);
  readonly financialComments = signal<string>('');
  readonly uploadedFormat    = signal<{ fileName: string; file: File } | null>(null);
  readonly isModalOpen       = signal(false);
  readonly isSubmitAttempted = signal(false);

  // ── Getters que exponen el servicio al template ───────────────────────────
  getStudentNames(): string { return this.formService.getStudentNames(this.thesisWork); }
  getDirectorName(): string {
    const id = this.thesisWork?.preliminaryDraftData?.proposalData?.director?.id;
    return this.formService.getMemberName(id) || 'No asignado';
  }
  getCodirectorName(): string {
    return this.formService.getMemberName(
      this.thesisWork?.preliminaryDraftData?.proposalData?.codirector?.id
    );
  }
  getAdvisorName(): string {
    return this.formService.getMemberName(
      this.thesisWork?.preliminaryDraftData?.proposalData?.advisor?.id
    );
  }

  // ── Fix: $any($event.target) reemplazado por métodos con tipado correcto ──
  onAcademicCommentsChange(event: Event): void {
    this.academicComments.set((event.target as HTMLTextAreaElement).value);
  }

  onFinancialCommentsChange(event: Event): void {
    this.financialComments.set((event.target as HTMLTextAreaElement).value);
  }

  // ── Manejo de documentos existentes ──────────────────────────────────────
  getExistingDocument(type: string): FileDocument | null {
    const targetType = type.toUpperCase().trim();

    if (this.thesisWork?.finalDeliveries?.length) {
      const lastDelivery = this.thesisWork.finalDeliveries.find(
        d => d.status === stateList.EN_REVISION
      ) ?? this.thesisWork.finalDeliveries[0];

      if (targetType === 'MONOGRAFIA' && lastDelivery.monograph)             return lastDelivery.monograph;
      if ((targetType === 'FORMATO' || targetType === 'FORMATO_E') && lastDelivery.formatE) return lastDelivery.formatE;
      if (targetType === 'ANEXOS' && lastDelivery.annexes)                   return lastDelivery.annexes ?? null;
    }

    return this.thesisWork?.documents?.find((doc: FileDocument) => {
      const currentDocType = (doc.type ?? '').toUpperCase().trim();
      if (targetType === 'MONOGRAFIA') return currentDocType === 'MONOGRAFIA';
      if (targetType === 'FORMATO' || targetType === 'FORMATO_E') {
        return currentDocType === 'FORMATO_E' || currentDocType === 'FORMATO';
      }
      if (targetType === 'ANEXOS') return currentDocType === 'ANEXOS';
      return currentDocType === targetType;
    }) ?? null;
  }

  // ── Manejo de archivo de paz y salvo ─────────────────────────────────────
  handleFileUploaded(event: { fileName: string; file: File }): void {
    this.uploadedFormat.set(event);
    this.isModalOpen.set(false);
    this.formService.notifyFileAttached(event.fileName);
  }

  removeFile(): void           { this.uploadedFormat.set(null); }
  downloadDocument(doc: FileDocument | null): void {
    if (doc) this.onDownloadFile.emit(doc);
  }

  // ── Envío ─────────────────────────────────────────────────────────────────
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
