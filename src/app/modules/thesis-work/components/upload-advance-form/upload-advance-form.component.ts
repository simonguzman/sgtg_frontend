import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { FileUploadModalComponent } from "../../../../shared/components/modals/file-upload-modal/file-upload-modal.component";
import { UploadAdvancePayload } from '../../interfaces/advance-playload.interface';

@Component({
  selector: 'app-upload-advance-form',
  imports: [ReactiveFormsModule, ButtonComponent, FileUploadModalComponent],
  templateUrl: './upload-advance-form.component.html',
  styleUrls: ['./upload-advance-form.component.css'],
})
export class UploadAdvanceFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);

  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;

  @Output() onSaveAdvance = new EventEmitter<UploadAdvancePayload>();
  @Output() onGoBack = new EventEmitter<void>();

  uploadedFiles = signal<{ fileName: string; file: File }[]>([]);
  isUploadModalOpen = signal(false);

  readonly advanceForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    comments: ['', Validators.required]
  });

  handleFileUploaded(event: { fileName: string; file: File }): void {
    this.uploadedFiles.update(files => [...files, event]);
    this.isUploadModalOpen.set(false);
  }

  removeFile(indexToRemove: number): void {
    this.uploadedFiles.update(files => files.filter((_, index) => index !== indexToRemove));
  }

  submit(): void {
    if (this.advanceForm.invalid) {
      this.advanceForm.markAllAsTouched();
      this.notificationService.show({
        title: 'Formulario incompleto',
        message: 'Por favor, complete el título y los comentarios del avance.',
        type: NotificationType.ERROR
      });
      return;
    }

    if (this.uploadedFiles().length === 0) {
      this.notificationService.show({
        title: 'Archivos requeridos',
        message: 'Debe adjuntar al menos un archivo como evidencia de su avance.',
        type: NotificationType.ERROR
      });
      return;
    }
    const formValues = this.advanceForm.getRawValue();
    this.onSaveAdvance.emit({
      formValues: {
        title: formValues.title,
        comments: formValues.comments,
      },
      files: this.uploadedFiles().map(item => item.file)
    });
  }

  isFieldInvalid(fieldName: keyof typeof this.advanceForm.controls): boolean {
    const control = this.advanceForm.controls[fieldName];
    return !!(control?.invalid && control?.touched);
  }

}
