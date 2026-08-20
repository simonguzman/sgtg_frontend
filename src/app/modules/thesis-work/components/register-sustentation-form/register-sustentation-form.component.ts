import { Component, computed, DestroyRef, EventEmitter, inject, input, OnInit, Output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { SelectOption, SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select.component';
import { RegisterSustentationFormService } from './services/register-sustentation-form.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { User } from '../../../users/interfaces/user.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';

export interface SustentationFormPayload {
  sustentationDate: string | Date;
  location: string;
  juror1: string;
  juror2: string;
}

@Component({
  selector: 'app-register-sustentation-form',
  templateUrl: './register-sustentation-form.component.html',
  styleUrls: ['./register-sustentation-form.component.css'],
  imports: [NgTemplateOutlet, ReactiveFormsModule, FileUploadModalComponent, ButtonComponent, DatePicker, InfoBannerComponent, SearchableSelectComponent],
  providers: [RegisterSustentationFormService]
})
export class RegisterSustentationFormComponent implements OnInit {
  protected readonly formService = inject(RegisterSustentationFormService);
  private readonly destroyRef    = inject(DestroyRef);

  thesisWork    = input.required<ThesisWork>();
  isSubmitting  = input<boolean>(false);
  @Output() onSave         = new EventEmitter<{ payload: SustentationFormPayload; file: File }>();
  @Output() onBack         = new EventEmitter<void>();
  @Output() onDownloadFile = new EventEmitter<FileDocument>();

  private readonly firstJurorSelectedId = signal<string>('');
  readonly isModalOpen       = signal<boolean>(false);
  readonly uploadedFormatE   = signal<{ fileName: string; file: File } | null>(null);
  readonly isSubmitAttempted = signal<boolean>(false);

  readonly uploadedFileName = computed<string>(() => {
    const fileData = this.uploadedFormatE();
    return fileData ? fileData.fileName : 'Formato_E - Sustentación';
  });

  get form() { return this.formService.form; }

  readonly availableJurors = computed<User[]>(() =>
    this.formService.getEligibleJurors(this.thesisWork())
  );

  protected readonly filteredJurorsForJ2 = computed<User[]>(() => {
    const firstId = this.firstJurorSelectedId();
    return this.availableJurors().filter(user => user.id !== firstId);
  });

  readonly juror1Options = computed<SelectOption[]>(() =>
    this.availableJurors().map(user => ({
      id: user.id, value: user.id, label: this.formService.getMemberFullName(user)
    }))
  );

  readonly juror2Options = computed<SelectOption[]>(() =>
    this.filteredJurorsForJ2().map(user => ({
      id: user.id, value: user.id, label: this.formService.getMemberFullName(user)
    }))
  );

  ngOnInit(): void {
    this.form.get('juror1')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id: string | null) => {
        const selectedId = id ?? '';
        this.firstJurorSelectedId.set(selectedId);
        if (this.form.get('juror2')?.value === selectedId) {
          this.form.get('juror2')?.setValue('');
        }
      });
  }

  // ← Simplificados: delegan al servicio con el ThesisWork completo,
  // sin extraer el objeto User embebido de la propuesta manualmente.
  getStudentNames(): string   { return this.formService.getStudentNames(this.thesisWork()); }
  getDirectorName(): string   { return this.formService.getDirectorName(this.thesisWork()); }
  getCodirectorName(): string { return this.formService.getCodirectorName(this.thesisWork()); }
  getAdvisorName(): string    { return this.formService.getAdvisorName(this.thesisWork()); }

  getMemberFullName(user: User | undefined): string {
    return this.formService.getMemberFullName(user);
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!(this.isSubmitAttempted() && control?.invalid) || !!(control?.invalid && control?.touched);
  }

  isFieldValid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!(control?.valid && (control?.touched || this.isSubmitAttempted()));
  }

  getExistingDocument(type: string): FileDocument | null {
    return this.formService.getExistingDocument(this.thesisWork(), type);
  }

  downloadDocument(doc: FileDocument | null): void {
    if (doc) this.onDownloadFile.emit(doc);
  }

  handleFileUploaded(event: { fileName: string; file: File }): void {
    this.uploadedFormatE.set(event);
    this.isModalOpen.set(false);
  }

  submit(): void {
    this.isSubmitAttempted.set(true);
    this.form.markAllAsTouched();

    const currentFile = this.uploadedFormatE();
    if (this.form.invalid || !currentFile) {
      this.formService.notifyIncompleteForm();
      return;
    }

    this.onSave.emit({ payload: this.form.getRawValue(), file: currentFile.file });
  }
}
