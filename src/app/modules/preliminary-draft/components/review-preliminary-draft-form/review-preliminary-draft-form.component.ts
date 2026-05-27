import { Component, computed, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { UserService } from '../../../users/services/user.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';

import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';

import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';

@Component({
  selector: 'app-review-preliminary-draft-form',
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, FileUploadModalComponent],
  templateUrl: './review-preliminary-draft-form.component.html',
  styleUrls: ['./review-preliminary-draft-form.component.css']
})
export class ReviewPreliminaryDraftFormComponent {
 private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  public readonly userService = inject(UserService);

  @Input({ required: true }) preliminaryDraft!: PreliminaryDraft;
  @Input() isSubmitting = false;

  @Output() onSaveEvaluation = new EventEmitter<{ formValues: any, file: File, annotatedFile?: File }>();
  @Output() onDownloadPreliminaryDraft = new EventEmitter<void>();

  uploadedSignedFile = signal<{ fileName: string; file: File } | null>(null);
  uploadedAnnotatedFile = signal<{ fileName: string; file: File } | null>(null);

  isUploadModalOpen = signal(false);
  isAnnotatedUploadModalOpen = signal(false);

  readonly evaluationForm = this.fb.group({
    result: ['', Validators.required],
    comments: ['', Validators.required],
    document: [null]
  });

  get isReadOnly(): boolean {
    return this.preliminaryDraft.state === stateList.APROBADO;
  }

  private parseDate(dateValue: any): Date | null {
    if (!dateValue) return null;
    if (dateValue instanceof Date) {
      return isNaN(dateValue.getTime()) ? null : dateValue;
    }
    if (typeof dateValue === 'string') {
      const cleanDateStr = dateValue.replace(/\s+/g, '');
      const standardDate = new Date(cleanDateStr);
      if (!isNaN(standardDate.getTime())) {
        return standardDate;
      }
      const parts = cleanDateStr.split('-');
      if (parts.length === 3) {
        const day = +parts[0];
        const month = +parts[1] - 1;
        const year = +parts[2];
        const manualDate = new Date(year, month, day);
        if (!isNaN(manualDate.getTime())) {
          return manualDate;
        }
      }
    }
    return null;
  }

  get currentDocument() {
    const documents = this.preliminaryDraft.documents || [];
    if (documents.length === 0) return null;
    return [...documents].sort((a, b) => {
      const dateA = this.parseDate(a.uploadDate);
      const dateB = this.parseDate(b.uploadDate);
      return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
    })[0];
  }

  get documentUploadDate(): string {
    const uploadDate = this.currentDocument?.uploadDate;
    const parsedDate = this.parseDate(uploadDate);
    return parsedDate
      ? parsedDate.toLocaleDateString('es-ES')
      : 'No disponible';
  }

  getStudentNames(): string {
    return this.userService.getAuthorsNames(this.preliminaryDraft.proposalData.authors);
  }

  getDirectorName(): string {
    return this.userService.getUserFullName(this.preliminaryDraft.proposalData.director.id);
  }

  getCodirectorName(): string {
    const codirector = this.preliminaryDraft.proposalData.codirector;
    return codirector && codirector.id ? this.userService.getUserFullName(codirector.id) : '';
  }

  getAdvisorName(): string {
    const advisor = this.preliminaryDraft.proposalData.advisor;
    return advisor && advisor.id ? this.userService.getUserFullName(advisor.id) : '';
  }

  handleFileUploaded(event: { fileName: string; file: File }): void {
    this.uploadedSignedFile.set(event);
    this.isUploadModalOpen.set(false);
  }

  handleAnnotatedFileUploaded(event: { fileName: string; file: File }): void {
    this.uploadedAnnotatedFile.set(event);
    this.isAnnotatedUploadModalOpen.set(false);
    this.notificationService.show({
      title: 'Feedback adjunto',
      message: 'El documento con anotaciones se ha cargado correctamente.',
      type: NotificationType.INFO
    });
  }

  submit(): void {
    const fileData = this.uploadedSignedFile();
    const annotatedData = this.uploadedAnnotatedFile();

    if (this.evaluationForm.invalid || !fileData) {
      this.evaluationForm.markAllAsTouched();
      this.showValidationErrorNotification(!fileData);
      return;
    }

    this.onSaveEvaluation.emit({
      formValues: this.evaluationForm.value,
      file: fileData.file,
      annotatedFile: annotatedData?.file
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.evaluationForm.get(fieldName);
    return !!(control?.invalid && control?.touched);
  }

  private showValidationErrorNotification(missingFile: boolean): void {
    this.notificationService.show({
      title: 'Formulario incompleto',
      message: missingFile
        ? 'Debe adjuntar el Formato B firmado para guardar la evaluación.'
        : 'Por favor, complete el veredicto y las observaciones.',
      type: NotificationType.ERROR
    });
  }
}
