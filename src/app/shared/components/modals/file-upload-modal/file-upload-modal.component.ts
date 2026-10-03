import { Component, ElementRef, EventEmitter, inject, Input, Output, ViewChild } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { NotificationService } from '../../notifications/services/notification.service';
import { NotificationType } from '../../notifications/models/notification.model';

@Component({
  selector: 'app-file-upload-modal',
  imports: [DialogModule],
  templateUrl: './file-upload-modal.component.html',
  styleUrls: ['./file-upload-modal.component.css']
})
export class FileUploadModalComponent {
  private readonly notificationService = inject(NotificationService);

  @Input() isOpen: boolean = false;
  @Input() description: string = '';
  @Input() uploadedBy: string = '';

  @Output() onFileUploaded = new EventEmitter<{ fileName: string, file: File }>();
  @Output() onClose = new EventEmitter<void>();
  @ViewChild('fileInput') private readonly fileInputRef?: ElementRef<HTMLInputElement>;

  uploadedFile: File | null = null;

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        this.notificationService.show({
          title: 'Archivo no válido',
          message: 'Solo se permiten archivos en formato PDF.',
          type: NotificationType.ERROR
        });
        input.value = '';
        return;
      }
      this.uploadedFile = file;
      this.onFileUploaded.emit({
        fileName: this.uploadedFile.name,
        file: this.uploadedFile
      });
    }
  }

  removeFile(): void {
    this.uploadedFile = null;
    if (this.fileInputRef) {
      this.fileInputRef.nativeElement.value = '';
    }
  }

  closeModal(): void {
    this.removeFile();
    this.onClose.emit();
  }
}
